// In your routes/server.js (create this file)
const express = require('express');
const router = express.Router();
const { better_sqlite_client } = require('../db');

const rcon = require("../modules/rcon");
const is_authenticated = require("../modules/middleware");

router.get('/add-server', is_authenticated, (req, res) => {
    res.render('add-server');
});

router.get('/servers', is_authenticated, (req, res) => {
    res.render('servers');
});

router.get('/manage/:server_id', is_authenticated, async (req, res) => {
    try {
        const server_id = req.params.server_id;
        const servers_query = better_sqlite_client.prepare(`
      SELECT * FROM servers WHERE id = ?
    `);
        const server = servers_query.get(server_id);

        if (!server) {
            return res.status(404).send('Server not found');
        }

        const response = await rcon.rcons[server_id].execute('hostname');
        const hostname = response.toString().split("=")[1].trim();
        const host = rcon.details[server_id].host;
        const port = rcon.details[server_id].port;

        res.render('manage', { server_id, hostname, host, port });
    } catch (error) {
        console.error(error);
        return res.status(404).send('Internal Server Error!');
    }
});

router.post('/api/add-server', is_authenticated, async (req, res) => {
    const { server_ip, server_port, rcon_password } = req.body;

    try {
        const insert_query = better_sqlite_client.prepare(`
      INSERT INTO servers (serverIP, serverPort, rconPassword) VALUES (?, ?, ?)
    `);
        const result = insert_query.run(server_ip, server_port, rcon_password);

        if (result.changes > 0) {
            res.status(201).json({ message: 'Server added successfully' });
            rcon.init();
        } else {
            res.status(500).json({ error: 'Failed to add the server' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/api/servers', is_authenticated, async (req, res) => {
    try {
        const servers_query = better_sqlite_client.prepare(`
      SELECT * FROM servers
    `);
        const servers = servers_query.all();
        for (var i = 0; i < servers.length; i++) {
            const server = servers[i];
            const server_id = server.id.toString();
            let hostname = "-";

            if (server_id in rcon.rcons) {
                servers[i].connected = rcon.rcons[server_id].isConnected();
                servers[i].authenticated = rcon.rcons[server_id].isAuthenticated();

                if (servers[i].connected && servers[i].authenticated) {
                    const response = await rcon.rcons[server_id].execute('hostname');
                    hostname = response.toString().split("=")[1].trim();
                }
            } else {
                servers[i].connected = false;
                servers[i].authenticated = false;
            }

            servers[i].hostname = hostname;
        }

        res.json({ servers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching servers.' });
    }
});

router.post('/api/reconnect-server', is_authenticated, async (req, res) => {
    try {
        const server_id = req.body.server_id;

        const server_query = better_sqlite_client.prepare(`
      SELECT * FROM servers WHERE id = ?
    `);
        const server = server_query.get(server_id);

        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        // Reconnect using RCON
        await rcon.connect(server_id, server);

        res.status(200).json({ status: 200 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while reconnecting to the server.' });
    }
});

router.post('/api/delete-server', is_authenticated, async (req, res) => {
    try {
        const server_id = req.body.server_id;

        const delete_server_query = better_sqlite_client.prepare('DELETE FROM servers WHERE id = ?');
        const result = delete_server_query.run(server_id);

        if (result.changes > 0) {
            res.status(200).json({ status: 200, message: 'Server deleted successfully' });
        } else {
            res.status(404).json({ status: 404, message: 'Server not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while deleting the server.' });
    }
});

module.exports = router;
