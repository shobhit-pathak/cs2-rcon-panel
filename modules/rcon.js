const Rcon = require('rcon-srcds').default;
const { better_sqlite_client } = require('../db');


class RconManager {
    constructor() {
        this.rcons = {};
        this.details = {};
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
                await this.connect(server_id, server)
            }
        } catch (error) {
            console.error('Error connecting to MongoDB:', error);
        }
    }

    async send_heartbeat(server_id, server) {
        try {
            const status_promise = this.rcons[server_id].execute(`status`);
            
            const timeout_promise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    reject(Error('Timeout - status command not received within 5 seconds'));
                }, 5000); // 5 seconds timeout
            });
            let status = await Promise.race([status_promise, timeout_promise]);
            console.log("HEARTBEAT RESPONSE:", status)
        } catch (error) {
            console.log("Error in connecting to the server, reconnecting.....");
            await this.disconnect_rcon(server_id);
            await this.connect(server_id, server);
        }
    }

    async connect(server_id, server) {
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
            // Handle the authentication error here as needed.
        }

        setInterval(async () => this.send_heartbeat(server_id, server), 5000);
        
        this.rcons[server_id] = rcon_connection;
        this.details[server_id] = {
            host: server.serverIP,
            port: server.serverPort,
            rcon_password: server.rconPassword,
            connected: rcon_connection.isConnected(),
            authenticated: rcon_connection.isAuthenticated()
        };
        return;
    }

    async disconnect_rcon(server_id) {
        console.log('starting disconnect', server_id)
        if ( !(server_id in this.rcons) || (!this.rcons[server_id].connected)) {
            return Promise.resolve();
        }
    
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
        });
    }
}

module.exports = new RconManager();
