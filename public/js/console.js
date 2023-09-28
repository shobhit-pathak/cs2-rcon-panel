$(document).ready(function () {
    const current_path = window.location.pathname;

    function fetch_servers() {
        $.ajax({
            url: '/api/servers',
            type: 'GET',
            success: function (data) {
                $('#serverList').empty();

                data.servers.forEach(function (server) {
                    const card = `
                <div class="card server-card">
                  <div class="card-header">
                    <h3 class="card-title">${server.hostname} (${server.serverIP}:${server.serverPort})</h3>
                  </div>
                  <div class="card-body">
                    RCON Password: <input type="password" id="rconPassword" class="rcon-password-${server.id}" value="${server.rconPassword}" class="password-mask" disabled>
                    <button class="btn btn-sm btn-secondary toggle-password" server-id="${server.id}" class="hide-unhide-rcon">
                      <i class="fa fa-eye" server-id="${server.id}" id="toggleEyeIcon-${server.id}"></i>
                    </button>
                    <p class="status connected-status ${server.connected ? 'connected' : 'disconnected'}">
                      RCON Connected: ${server.connected ? 'Yes' : 'No'}
                    </p>
                    <p class="status authenticated-status ${server.authenticated ? 'authenticated' : 'not-authenticated'}">
                      RCON Authenticated: ${server.authenticated ? 'Yes' : 'No'}
                    </p>
                    ${(!server.connected || !server.authenticated) ? '<button class="btn btn-success" server-id="' + server.id + '" id="reconnect_server">Reconnect</button>' : ''}
                    <a href="/manage/${server.id}" class="btn btn-primary">Manage</a>
                    <button class="btn btn-danger" server-id='${server.id}' id="delete_server">Delete</button>
                  </div>
                </div>
              `;
                    $('#serverList').append(card);
                });
                $(".toggle-password").click((event) => {
                    let server_id = $(event.target).attr("server-id");
                    toggle_password_visibility(server_id)
                });
                $("#reconnect_server").click(async (element) => {
                    try {
                        const server_id = $(element.target).attr("server-id");
                        const response = await $.ajax({
                            url: '/api/reconnect-server',
                            type: 'POST',
                            data: JSON.stringify({ server_id: server_id }),
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        });
                        if (response.status === 200) {
                            fetch_servers();
                        } else {
                            console.error('Server responded with a non-200 status code:', response.status);
                            alert('An error occurred while reconnecting to the server.');
                        }
                    } catch (error) {
                        console.error(error);
                        alert('An error occurred while reconnecting to the server.');
                    }
                });
                $("#delete_server").click(async (element) => {
                    const confirmed = confirm("Are you sure you want to delete this server?");
                    if (confirmed) {
                        window.server_id = $(element.target).attr("server-id");
                        await send_post_request("/api/delete-server");
                        fetch_servers();
                    }
                });
            },
            error: function (error) {
                console.error(error);
                alert('An error occurred while fetching servers.');
            },
        });
    }
    if (current_path == "/servers") {
        fetch_servers();
    }

    function toggle_password_visibility(server_id) {
        const password_field = document.getElementsByClassName("rcon-password-" + server_id)[0]
        const eye_icon = document.getElementById(`toggleEyeIcon-${server_id}`);
      
        if (password_field.type === 'password') {
            password_field.type = 'text';
            eye_icon.classList.remove('fa-eye');
            eye_icon.classList.add('fa-eye-slash');
        } else {
            password_field.type = 'password';
            eye_icon.classList.remove('fa-eye-slash');
            eye_icon.classList.add('fa-eye');
        }
      }

    async function send_post_request(apiEndpoint, data = {}) {
        try {
            data.server_id = window.server_id
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                console.log(data.message)
                alert(data.message);
            } else {
                alert('Failed to perform the action');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred');
        }
    }

    $('#pause_game').on('click', function () {
        send_post_request('/api/pause');
    });

    $('#unpause_game').on('click', function () {
        send_post_request('/api/unpause');
    });

    $('#restart_game').on('click', function () {
        send_post_request('/api/restart');
    });

    $('#start_warmup').on('click', function () {
        send_post_request('/api/start-warmup');
    });

    $('#knife_start').on('click', function () {
        send_post_request('/api/start-knife');
    });

    $('#swap_team').on('click', function () {
        send_post_request('/api/swap-team');
    });

    $('#go_live').on('click', function () {
        send_post_request('/api/go-live');
    });

    $('#rconInputBtn').on('click', function () {
        let data = {
            command: $('#rconInput').val()
        };
        send_post_request('/api/rcon', data);
        $('#rconInput').val('');
    });

    $('#list_backups').on('click', function () {
        send_post_request('/api/list-backups');
    });

    $('#restore_latest_backup').on('click', function () {
        send_post_request('/api/restore-latest-backup');
    });

    $('#restore_backup').on('click', function () {
        const round_number = prompt('Enter round number to restore:');
        if (round_number !== null && round_number.trim() !== '') {
            const round_number_value = parseInt(round_number);
            if (!isNaN(round_number_value)) {
                send_post_request('/api/restore-round', { round_number: round_number_value });
            } else {
                alert('Invalid round number. Please enter a valid number.');
            }
        } else {
            alert('Round number cannot be empty. Please enter a valid number.');
        }
    });
    $('#server_setup_form').on('submit', async function (event) {
        event.preventDefault();
        const data = {
            team1: $('#team1').val(),
            team2: $('#team2').val(),
            selectedMap: $('#selectedMap').val(),
            game_mode: $('#game_mode').val(),
            server_id: window.server_id
        };
        send_post_request('/api/setup-game', data);
    });
});
