const Rcon = require('rcon-srcds').default;
const { better_sqlite_client } = require('../db');


class RconManager {
    constructor() {
        this.rcons = {};
        this.details = {};
        this.servers = {};
        this.init();
    }

    async init() {
        try {
            const servers_query = better_sqlite_client.prepare(`
                SELECT * FROM servers
            `);
            const servers = servers_query.all();
            console.log('All servers in DB:', servers);
            for (const server of servers) {
                const server_id = server.id.toString();
                if (server_id in this.rcons) continue;
                this.servers[server_id] = server;
                await this.connect(server_id, server);
            }
        } catch (error) {
            console.error('Error connecting to MongoDB:', error);
        }
    }

    async execute_command(server_id, command) {
        try {
            let rcon_connection = this.rcons[server_id];
            let server = this.servers[server_id];
            if (!rcon_connection.isConnected() || !rcon_connection.isAuthenticated() || !rcon_connection.connection.writable) {
                console.log("Connection issue detected, reconnecting to the server:", server_id)
                await this.disconnect_rcon(server_id);
                await this.connect(server_id, server);
            }
            rcon_connection = this.rcons[server_id];
            if (rcon_connection.isConnected() && rcon_connection.isAuthenticated() && rcon_connection.connection.writable) {
                const executePromise = new Promise(async (resolve, reject) => {
                    try {
                        const response = await Promise.race([
                            rcon_connection.execute(command),
                            new Promise((resolve, reject) => {
                                setTimeout(() => {
                                    resolve({ error: 'Command execution timed out' });
                                }, 200); // 200ms timeout
                            }),
                        ]);
                        resolve(response);
                    } catch (error) {
                        reject(error);
                    }
                });

                const response = await executePromise;

                if (response.error) {
                    return 200;
                }
                return response.toString();
            } else {
                console.log(`Unable to establish connection to the server id: ${server_id}, cannot execute command: ${command}`)
                return 400
            }
        } catch (error) {
            console.error('Error in execute_command:', error);
            return 400
        }
    }

    async send_heartbeat(server_id, server) {
        if (!this.rcons[server_id].connection.writable) {
            console.log("Connection unwritable, reconnecting...")
            await this.disconnect_rcon(server_id);
            await this.connect(server_id, server);
        }
        try {
            const status_promise = this.rcons[server_id].execute(`status`);
            
            const timeout_promise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    reject(Error('Timeout - status command not received within 5 seconds'));
                }, 5000); // 5 seconds timeout
            });
            let status = await Promise.race([status_promise, timeout_promise]);
            console.log("HEARTBEAT SUCCESS", server_id)
        } catch (error) {
            console.log("Error in connecting to the server, reconnecting..... ERROR:", error);
            await this.disconnect_rcon(server_id);
            await this.connect(server_id, server);
        }
    }

    async connect(server_id, server) {
        try {
            let rcon_connection = null;
            rcon_connection = new Rcon({ host: server.serverIP, port: server.serverPort, timeout: 5000 });
            console.log("CONNECTING RCON", server_id, server.serverIP, server.serverPort);
    
            // Set a timeout for the authentication process
            const authenticationTimeout = setTimeout(async () => {
                console.error('RCON Authentication timed out', server_id);
                try {
                    await this.disconnect_rcon(server_id); // Disconnect the RCON connection
                    console.log('Timed out, disconnected RCON', server_id);
                } catch (error) {
                    console.error('Error disconnecting RCON', server_id, error);
                }
            }, 10000);
        
            try {
                await rcon_connection.authenticate(server.rconPassword);
                clearTimeout(authenticationTimeout);
                console.log('RCON Authenticated', server_id, server.serverIP, server.serverPort);
            } catch (error) {
                clearTimeout(authenticationTimeout);
                console.error('RCON Authentication failed', server_id, error);
            }
            
            this.rcons[server_id] = rcon_connection;
            this.details[server_id] = {
                host: server.serverIP,
                port: server.serverPort,
                rcon_password: server.rconPassword,
                connected: rcon_connection.isConnected(),
                authenticated: rcon_connection.isAuthenticated()
            };
            if (rcon_connection.isConnected() && rcon_connection.isAuthenticated()) {
                this.details[server_id].heartbeat_interval = setInterval(async () => this.send_heartbeat(server_id, server), 5000);
            }
            return;
        }  catch (error) {
            console.error('[CONNECTION ERROR]', error);
        }
    }

    async disconnect_rcon(server_id) {
        console.log('starting disconnect', server_id)
        if ( !(server_id in this.rcons) || (!this.rcons[server_id].connected)) {
            return Promise.resolve();
        }
        clearInterval(this.details[server_id].heartbeat_interval)
        this.rcons[server_id].authenticated = false;
        this.rcons[server_id].connected = false;
    
        return new Promise((resolve, reject) => {
            this.rcons[server_id].connection.once('close', () => {
                resolve();
            });
    
            this.rcons[server_id].connection.once('error', (e) => {
                console.error('Socket error during disconnect:', e);
                resolve();
            });
    
            this.rcons[server_id].connection.end(); // Close the socket gracefully
            console.log("Disconnected", server_id)
        });
    }
}

module.exports = new RconManager();
