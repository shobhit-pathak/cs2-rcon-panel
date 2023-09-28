# CS2 RCON Web Panel

A simple web panel to control CS2 servers via RCON

## Usage
- Install NodeJS 18.0 or higher
- Run `npm install` in the root project folder
- Run `nodemon app.js` in the root project folder
- Default login credentials can be changed from db.js

## Abilities 

- Setup Competitive/Wingman gamemodes
- Pause/Unpause/Restart match
- List and restore round backups
- Start Knife/Warmup/Live rounds (CFGs are in cfg folder, sent via RCON)
- Send RCON Commands to the server

## Todo

- Add teams and players
- Add password option while setting up the server
- Improve UX/UI
- Improve/clean code
- Create executable 

## Limitations

- Cannot get logs, feeds (log_address is not present in CS2 as of now)

## License

MIT