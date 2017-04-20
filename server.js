var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var fs = require('fs');
var path = require('path');

var go = require('./scripts/go');
var acct = require('./scripts/accounts')(__dirname + '/userdata.json');

var portno = 3000;

//Provide a webpage
app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

//Allow access to the go board script
app.get('/scripts/goban.js', function(req, res) {
    res.sendFile(__dirname + '/scripts/goban.js');
});

//Provide a stylesheet
app.get('/stylesheet.css', function(req, res) {
    res.sendFile(__dirname + '/stylesheet.css');
});

//Dictionary of webpages
var pages = {
    'lobby'     : 'pages/lobby.html',
    'host'      : 'pages/host.html',
    'game'      : 'pages/game.html'
};

function assignPageByName(name) {
    fs.readFile(path.join(__dirname, pages[name]), 'utf8', function(err, data) {
        pages[name] = data.toString();
    });
};

//Load all of the webpages
for (pg_nm in pages) {
    assignPageByName(pg_nm);
}

//The users connected
var users = [];

//The games currently in progress
var games = [];

function getUserBySocketID(sid) {

    var result = undefined;
    for (var i = 0; i < users.length; i++) {
        var user = users[i];

        if (user.socketID == sid) {
            result = user;
            break;
        }
    }

    return result;
}

function getOpenRooms(min, max) {
    var found = 0;
    var list = [];
    
    var rooms = io.sockets.adapter.rooms;

    for (var roomname in rooms) {
        if (rooms[roomname].length == 1) {
            if (found >= min && found < max) {
                list.push(roomname);
            } else if (found >= max)
                break;
            found++;
        }
    }

    return list;

}

//Whenever someone connects this gets executed
io.on('connection', function(socket){

    socket.leave(socket.id);

    console.log('A user connected');

    //Log onto the service
    socket.on('login', function (data) {

        console.log('A user is attempting to log in.');

        if (data === void(0) || !(data.hasOwnProperty('username'))) {
            socket.emit('login_err', 'Invalid message format.');
            console.log('Login failed: Invalid login format.');
            return;
        }
        
        //Ensure the user doesn't exist
        for (var i = 0; i < users.length; i++) {
            if (users[i].username == data.username) {
                socket.emit('login_err', 'Invalid credentials.');
                console.log('Login failed: Invalid credentials.');
                return;
            }
        }
        
        //Validate the username
        if (!acct.verifyPassword(data.username, data.password)) {
            socket.emit('login_err', 'Invalid credentials');
            return;
        }

        //Add the user on success
        data.password = undefined;
        users.push(data);
        data.socketID = socket.id;
        data.roomname = undefined;
        
        //Confirm the username and send the lobby page
        var res = {
            'username' : data.username,
            'html' : pages['lobby'],
            'rooms' : getOpenRooms(0, 20)
        };

        socket.emit('login_succ', res);
        console.log('User ' + data.username + ' has logged in with socket ' + socket.id);
        
    });
    
    socket.on('signup', function (data) {
        //Sign up for the service if the username and password are available
        console.log('A user is attempting to sign up.');

        if (data === void(0) || !(data.hasOwnProperty('username') && data.hasOwnProperty('password'))) {
            socket.emit('login_err', 'Invalid message format.');
            console.log('Signup failed: Invalid signup form.');
        } else if (data.username.length == 0 || data.password.length < 8) {
            socket.emit('login_err', 'Invalid username');
            return;
        } else if (acct.addAccount(data.username, data.password)) {
            //Log the user in automatically

            console.log(data.username + ' has signed up');

            data.password = undefined;
            users.push(data);
            data.socketID = socket.id;
            data.roomname = undefined;

            //My date
            acct.setAccountValue(data.username, 'eloRank', 0);

            var res = {
                'username' : data.username,
                'html' : pages['lobby'],
                'rooms' : getOpenRooms(0, 20)
            };

            socket.emit('login_succ', res);
        } else {
            socket.emit('login_err', 'Username already taken');
            console.log('A user failed to sign up');
        }

    });

    //Host a room
    socket.on('host_room', function(data) {
        
        //Get the user making the request
        var sender = getUserBySocketID(socket.id);

        if (sender === void(0) || data === void(0) 
        || !(data.hasOwnProperty('roomname'))) {
            socket.emit('host_room_err', 'Invalid message format.');
            console.log('Invalid host request.');
            return;
        }

        var roomname = data.roomname;
        
        //Ban the empty string
        if (roomname.length == 0) {
            socket.emit('host_room_err', 'Cannot have empty string as room name');
            return;
        }

        if (io.nsps['/'].adapter.rooms[roomname] && io.nsps['/'].adapter.rooms[roomname].length > 0) {
            //Do not allow a user to host an existing room
            socket.emit('host_room_err', 'Room ' + roomname + ' already exists.');
            console.log(sender.username + ' attempted to host an existing room');
        } else if (sender.roomname != null || sender.roomname !== undefined) {
            //Do not allow a user to host two rooms at a time
            socket.emit('host_room_err', 'Cannot play more than one game at a time');
            console.log(sender.username + ' attempted to play multiple games at once; already in ' + sender.roomname);
        } else {
            //Join the brand new room
            socket.join(roomname);
            socket.emit('host_room_succ', {
                'roomname' : roomname,
                'html' : pages['host']}
            );
            sender.roomname = roomname;

            console.log('Room ' + roomname + ' has been created by ' + sender.username + '.');
            console.log(getOpenRooms(0, 10));
        }
    });

    //Request for room listing
    socket.on('req_open_rooms', function() {
        //Get the room names
        var rooms = getOpenRooms(0, 20);
        
        //Associate the opponent with each room
        for (var i = 0; i < rooms.length; i++)
            rooms[i] = {
                'roomname' : rooms[i],
                'opponent' : getUserBySocketID(Object.keys(io.sockets.adapter.rooms[rooms[i]].sockets)[0]).username
            };

        socket.emit('open_room_list', rooms);
    });

    //Join a room
    socket.on('join_room', function(data) {
        
        var sender = getUserBySocketID(socket.id);

        if (data === void(0) || !(data.hasOwnProperty('roomname'))) {
            socket.emit('join_room_err', 'Invalid message format.');
            console.log('Invalid join request.');
            return;
        }

        var roomname = data.roomname;
        console.log('User wants to join ' + roomname);

        var room = io.nsps['/'].adapter.rooms[roomname];
        var people = (room === undefined) ? 0 : room.length;

        //Go matches limit to two players.
        if(people > 1) {
            //Error joining room
            socket.emit('join_room_err', 'Room ' + roomname + ' is full.');
            console.log(sender.username + ' attempted to join a filled room.');
        } else if (people == 0) {
            var res = {
                'description' : 'Room ' + roomname + ' does not exist.'
            };

            console.log('Response: ' + res.description);

            socket.emit('join_room_err', res);
        } else {
            //Join successfully
            socket.join(roomname);
            sender.roomname = roomname;
            
            //Get the opponent
            var opponent;
            for (var i = 0; i < users.length; i++) {
                var user = users[i];
                
                if (user == sender)
                    continue;

                if (user.roomname == roomname) {
                    opponent = user;
                    break;
                }
            
            }
            
            //Randomly choose a player to go first (black is first index)
            var players = (Math.random() >= 0.5)
                        ? [sender.username, opponent.username]
                        : [opponent.username, sender.username];

            //Make the game
            var boardObj = new go.GoBoard(19);
            var gameObj = new go.GoMatch(boardObj, 0, [], [], players);
            games.push(gameObj);
            
            //Send response to players
            var response = {
                'roomname' : roomname,
                'html' : pages['game'],
                'players' : players
            }

            socket.emit('join_room_succ', response);
            io.of('/').connected[opponent.socketID].emit('join_room_succ', response);


            console.log(user.username + ' joined ' + roomname + ' successfully.');
        }
    });
    
    //Leave the current room/game.
    socket.on('leave_room', function() {

        var user = getUserBySocketID(socket.id);
        
        //Send the lobby page
        socket.emit('leave_room_succ', {'html' : pages['lobby']});

        //Kick the other player
        for (var i = 0; i < users.length; i++) {
            var usr = users[i];

            if (usr === undefined || user == usr)
                continue;

            if (usr.roomname == user.roomname) {
                io.of('/').connected[usr.socketID].emit('leave_room_succ', {
                    'html' : pages['lobby']
                });
                
                io.of('/').connected[usr.socketID].leave(usr.roomname);
                usr.roomname = undefined;

                break;
            }
        }
        
        //Leave the room for good
        socket.leave(user.roomname);
        user.roomname = undefined;
    });

    //Player move received
    socket.on('player_move', function(data) {
        
        var user = getUserBySocketID(socket.id);

        //First, get the game
        var game = undefined;
        var i;
        for (i = 0; i < games.length; i++) {
            if (games[i].playerNames[0] == user.username
             || games[i].playerNames[1] == user.username) {
                game = games[i];
                break;
             }
        }

        //Verify that the player is in that game
        //and that it is that player's turn. If
        //valid, apply the move to the game.
        if (game !== undefined) {
            //Make the move
            var color = game.playerNames[0] == user.username ? -1 : 1;
            var err = data.pass ? game.passTurn(color) : game.placeStone(data.x, data.y, color);
            //console.log('Game move has error code ' + err);
            
            if (err == 5) {
                //Game over
                games.splice(i, 1);

                //Update player rankings
                /* TODO: Add ranking update */
            } else if (err != 0)
                return;
            
            //Finally, send the updated move
            var gameState = {
                'board'     : game.currBoard.board,
                'turn'      : game.turn,
                'score'     : game.scoreBoard(),
                'lastmove'  : (color == -1 ? 'Black' : 'White') + (data.pass ? ' passes' : (' plays ' + data.x + ',' + data.y))
            };
            
            //Send the update to the sender
            io.of('/').connected[user.socketID].emit('game_update', gameState);
            
            //Give the opponent the news
            var oppName = game.playerNames[color == 1 ? 0 : 1];
            for (var i = 0; i < users.length; i++) {
                if (users[i].username == oppName) {
                    io.of('/').connected[users[i].socketID].emit('game_update', gameState);
                    break;
                }
            }

        }

    });

    //Whenever someone disconnects this piece of code executed
    socket.on('disconnect', function () {
        console.log('Detected disconnect');

        for (var i = 0; i < users.length; i++) {
            //Remove the user associated with the socket
            if (users[i].socketID == socket.id) {
                console.log('\'' + users[i].username + '\' has disconnected');
                
                //Get the room name. We might need to empty a room
                var room = users[i].roomname;

                users.splice(i, 1);
                
                console.log('Purging room ' + room);

                //Remove user if necessary
                for (i = 0; room !== undefined && i < users.length; i++) {
                    console.log('Check user ' + users[i].username);
                    if (users[i].roomname == room) {

                        console.log(users[i].username + ' is still in room ' + room);

                        io.of('/').connected[users[i].socketID].emit('leave_room_succ', {
                            'html' : pages['lobby']
                        });

                        io.of('/').connected[users[i].socketID].leave(users[i].roomname);
                        users[i].roomname = undefined;

                        break;
                    }
                }

                break;
            }
        }

    });

});

http.listen(portno, function(){
    console.log('listening on port ' + portno);
});
