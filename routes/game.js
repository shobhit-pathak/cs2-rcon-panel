const express = require('express');
const router = express.Router();
const readline = require('readline');
const fs = require('fs');

const rcon = require("../modules/rcon");
const is_authenticated = require("../modules/middleware");

const ALLOWED_STEAM_IDS = ['76561198154367261']

router.post('/api/setup-game', is_authenticated, async (req, res) => {
    try {
        const server_id = req.body.server_id;
        const team1 = req.body.team1;
        const team2 = req.body.team2;
        const selected_map = req.body.selectedMap;
        const game_mode = req.body.game_mode.toString();
        // rcon.rcons[server_id].execute(`mp_teamname_1 "${team1}"`);
        // rcon.rcons[server_id].execute(`mp_teamname_2 "${team2}"`);
        // rcon.rcons[server_id].execute(`game_mode ${game_mode}`);
        if (team1.trim() != "") {
            await rcon.execute_command(server_id, `mp_teamname_1 "${team1}"`);
        }
        if (team2.trim() != "") {
            await rcon.execute_command(server_id, `mp_teamname_2 "${team2}"`);
        }
        await rcon.execute_command(server_id, `game_mode ${game_mode}`);
        if (game_mode == "1") {
            execute_cfg_on_server(server_id, './cfg/live.cfg');
        } else if (game_mode == "2") {
            execute_cfg_on_server(server_id, './cfg/live_wingman.cfg');
        }
        // rcon.rcons[server_id].execute(`mp_warmup_pausetimer 1`);
        // rcon.rcons[server_id].execute(`changelevel ${selected_map}`);
        await rcon.execute_command(server_id, `mp_warmup_pausetimer 1`);
        await rcon.execute_command(server_id, `changelevel ${selected_map}`);

        // Adding 1 second delay in executing warmup.cfg to make it effective after map has been changed.
        setTimeout(() => {
            execute_cfg_on_server(server_id, './cfg/warmup.cfg');
        }, 1000)

        return res.status(200).json({ message: 'Game Created!' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/api/restart', is_authenticated, async (req, res) => {
    try {
        const server_id = req.body.server_id;
        // rcon.rcons[server_id].execute('mp_restartgame 1');
        await rcon.execute_command(server_id, `mp_restartgame 1`);
        return res.status(200).json({ message: 'Game restarted' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/api/start-warmup', is_authenticated, async (req, res) => {
    try {
        const server_id = req.body.server_id;
        // rcon.rcons[server_id].execute('mp_restartgame 1');
        await rcon.execute_command(server_id, `mp_restartgame 1`);
        execute_cfg_on_server(server_id, './cfg/warmup.cfg');

        return res.status(200).json({ message: 'Warmup started!' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/api/start-knife', is_authenticated, async (req, res) => {
    try {
        const server_id = req.body.server_id;
        // rcon.rcons[server_id].execute('mp_warmup_end');
        // rcon.rcons[server_id].execute('mp_restartgame 1');
        await rcon.execute_command(server_id, `mp_warmup_end`);
        await rcon.execute_command(server_id, `mp_restartgame 1`);
        execute_cfg_on_server(server_id, './cfg/knife.cfg');

        return res.status(200).json({ message: 'Knife started!' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/api/swap-team', is_authenticated, async (req, res) => {
    try {
        const server_id = req.body.server_id;
        // rcon.rcons[server_id].execute('mp_swapteams');
        await rcon.execute_command(server_id, `mp_swapteams`);
        return res.status(200).json({ message: 'Teams Swapped!' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/api/go-live', is_authenticated, async (req, res) => {
    try {
        const server_id = req.body.server_id;
        // rcon.rcons[server_id].execute('mp_warmup_end');
        await rcon.execute_command(server_id, `mp_warmup_end`);
        // const response = await rcon.rcons[server_id].execute('game_mode');
        const response = await rcon.execute_command(server_id, `game_mode`);
        const game_mode = response.split("=")[1].trim().toString();
        if (game_mode == "1") {
            console.log("Executing live.cfg")
            execute_cfg_on_server(server_id, './cfg/live.cfg');
        } else if (game_mode == "2") {
            console.log("Executing live_wingman.cfg")
            execute_cfg_on_server(server_id, './cfg/live_wingman.cfg');
        }
        // rcon.rcons[server_id].execute('mp_restartgame 1');
        await rcon.execute_command(server_id, `mp_restartgame 1`);

        return res.status(200).json({ message: 'Match is live!!' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// List Round Backups API
router.post('/api/list-backups', is_authenticated, async (req, res) => {
    try {
        const server_id = req.body.server_id;
        // const response = await rcon.rcons[server_id].execute('mp_backup_restore_list_files');
        const response = await rcon.execute_command(server_id, "mp_backup_restore_list_files");
        console.log('Server response:', response);
        return res.status(200).json({ message: response });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Restore Round API
router.post('/api/restore-round', is_authenticated, async (req, res) => {
    try {
        const server_id = req.body.server_id;
        let round_number = req.body.round_number.toString()
        if (round_number.length == 1) {
            round_number = "0" + round_number;
        }
        console.log(`SENDING mp_backup_restore_load_file backup_round${round_number}.txt`)
        // rcon.rcons[server_id].execute(`mp_backup_restore_load_file backup_round${round_number}.txt`);
        // rcon.rcons[server_id].execute('mp_pause_match');
        await rcon.execute_command(server_id, `mp_backup_restore_load_file backup_round${round_number}.txt`);
        await rcon.execute_command(server_id, `mp_pause_match`);
        return res.status(200).json({ message: 'Round Restored!' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/api/restore-latest-backup', is_authenticated, async (req, res) => {
    try {
        const server_id = req.body.server_id;
        // const response = await rcon.rcons[server_id].execute('mp_backup_round_file_last');
        const response = await rcon.execute_command(server_id, `mp_backup_round_file_last`);
        const last_round_file = response.split("=")[1].trim().toString();
        if (last_round_file.includes('.txt')) {
            // rcon.rcons[server_id].execute(`mp_backup_restore_load_file ${last_round_file}`);
            // rcon.rcons[server_id].execute('mp_pause_match');
            await rcon.execute_command(server_id, `mp_backup_restore_load_file ${last_round_file}`);
            await rcon.execute_command(server_id, `mp_pause_match`);
            return res.status(200).json({ message: `Latest Round Restored! (${last_round_file})` });
        } else {
            return res.status(200).json({ message: 'No latest backup found!' });
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Pause Game API
router.post('/api/pause', is_authenticated, async (req, res) => {
    try {
        const server_id = req.body.server_id;
        // rcon.rcons[server_id].execute('mp_pause_match');
        const response = await rcon.execute_command(server_id, 'mp_pause_match');
        return res.status(200).json({ message: 'Game paused' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Unpause Game API
router.post('/api/unpause', is_authenticated, async (req, res) => {
    try {
        const server_id = req.body.server_id;
        // rcon.rcons[server_id].execute('mp_unpause_match');
        const response = await rcon.execute_command(server_id, 'mp_unpause_match');
        return res.status(200).json({ message: 'Game unpaused' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/api/rcon', is_authenticated, async (req, res) => {
    try {
        const server_id = req.body.server_id;
        const command = req.body.command;

        const response = await rcon.execute_command(server_id, command);

        if (response == 200) {
            return res.status(200).json({ message: 'Command sent!' });
        }

        return res.status(200).json({ message: 'Command sent! Response received:\n' + response.toString() });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/api/say-admin', is_authenticated, async (req, res) => {
    try {
        const server_id = req.body.server_id;
        const message = req.body.message;
        const message_to_send = "say " + message;
        await rcon.execute_command(server_id, message_to_send);
        return res.status(200).json({ message: 'Message sent!' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

function check_whitelisted_players() {
    rcon.rcons[server_id].execute('status_json')
        .then((response) => {
            console.log(response)
            const server_status = JSON.parse(response)
            const players = server_status['server']['clients']
            for (var i = 0; i < players.length; i++) {
                let player = players[i]
                if (!player.bot && player.steamid64.includes('7656') && !ALLOWED_STEAM_IDS.includes(player.steamid64)) {
                    console.log(`kick ${player.name}`)
                    rcon.rcons[server_id].execute(`kick ${player.name}`);
                }
            }
            return;
        })
        .catch(console.error);
}


function splitByByteLength(data, length) {
    const lines = data;
    const exportedLines = [];
    const lineEndChar = '; '
    let index = 0;

    for(let item = 0; item < lines.length; item++) {
        if(typeof exportedLines[index] === "undefined") {
            exportedLines[index] = "";
        }

        const lineFormatted = `${lines[item]}${lineEndChar}`;
        const lineBytes = Buffer.byteLength(lineFormatted, 'utf8');
        const bufferBytes = Buffer.byteLength(exportedLines[index], 'utf8');

        if((bufferBytes + lineBytes) < length) {
            exportedLines[index] += lineFormatted;
        } else {
            index++;
        }
    }

    return exportedLines;
}   

async function execute_cfg_on_server(server_id, cfg_path) {

    fs.readFile(cfg_path, 'utf8', (err, data) => {
        if (err) {
            throw err;
        }

        data = data.replace(/^\/\/.*$/m, '');
        data = data.split("\n");
        const new_data = [];
        for (let i = 0; i < data.length; i += 1) {
            const line = data[i].trim();
            const segments = line.split(' ');

            if(segments[0] === 'say' || segments.length == 1) {
                new_data.push(line);
            } else if (segments[0] !== '' && segments[0] !== '//') {
                new_data.push(`${segments[0]} ${segments[1].split('\t')[0]}`);
            }
        }
        const exported_lines = splitByByteLength(data, 512)

        async function execute_next_item(item) {
            try {
                if (item < exported_lines.length) {
                    console.log("Executing on server:", exported_lines[item]);
                    // rcon.rcons[server_id].execute(exported_lines[item]);
                    await rcon.execute_command(server_id, exported_lines[item]);
        
                    // Wait for 100ms before moving to the next iteration
                    setTimeout(() => {
                        execute_next_item(item + 1);
                    }, 100);
                }
            } catch (error) {
                console.log("[execute_next_item] Error:", error)
            }
        }
        execute_next_item(0);
    });
}

module.exports = {
    router
};
