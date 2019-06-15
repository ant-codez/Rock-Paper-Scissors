//get mongojs to talk to mongodb server
var mongojs = require('mongojs');
//port of mongod server and collection inside of database myGame
var db = mongojs('localhost:8000/myGame', ['account', 'deck']);

var express = require('express');
var app = express();
var server = require('http').Server(app);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client/index.html');
});

//serve lobby.html when action = "/lobby"
app.get('/lobby', (req, res) => {
    res.sendFile(__dirname + '/client/lobby.html');
});

app.use('/client', express.static(__dirname + '/client'));

server.listen(8000);

//global list of SOCKET[socket.id] objects to be called for data from connected client
var SOCKETS = [];
var ROOM_NO = 0;



// helper function that returns an array of the rooms a socket is in
var get_rooms = (socket) => {
    let info = Object.keys(socket.rooms); // socket.rooms is part of socket.io
    let id = info.shift();
    let rooms = [];
    while (info.length > 0) {
        rooms.push(info.shift());
    }

    return rooms;
}


// helper function that returns true if a socket is in a given room
var in_room = (socket, room) => {
    let rooms = get_rooms(socket);
    let room_index = rooms.indexOf(room);
    if (room_index == -1) {
        //console.log('in_room: ' + room + ' not found in current rooms');
        return false;
    }
    return true;
}

// helper function that broadcasts to the room it is in that it is leaving and joins another room
var join_room = (room_to_leave, socket, room_to_join) => {
    let rooms = get_rooms(socket);
    let room_index = rooms.indexOf(room_to_leave);
    if (room_index == -1) { // room to leave not available
        //console.log('join_room: ' + room_to_leave + ' not found in current rooms');
        return;
    }

    // let other sockets this is leaving current room
    socket.broadcast.to(rooms[room_index]).emit('leave_room', {
        id: socket.id,
        room: room_to_leave ,
    });

    // leave room
    socket.leave(rooms[room_index]);

    socket.join(room_to_join);
}

var check_win = (socket) => {
    //get room client is connected too
    let room = get_rooms(socket);
    //get an array of all clients connected to the room (2D array for now)
    let clients = [];

    //Get Id's of each client connected to room
    room.forEach((room) => {
        clients.push(Object.keys(io.sockets.adapter.rooms[room].sockets));
    });

    //debugging information
    try {
        console.log('<----- Game Event: CHECK_WIN() ----->');
        console.log('Room: ' + room);
        console.log(SOCKETS[clients[0][0]].username +' choice: ' + SOCKETS[clients[0][0]].choice);
        console.log(SOCKETS[clients[0][1]].username + ' choice: ' + SOCKETS[clients[0][1]].choice);
        console.log('<----- Game Event:     END     ----->');
    }
    catch(err)
    {
        console.log('Waiting for player to connect...');
    }

    //game logic
    if (SOCKETS[clients[0][0]].choice != 'none' && SOCKETS[clients[0][1]].choice != 'none') {
        if (SOCKETS[clients[0][0]].choice == 'rock' && SOCKETS[clients[0][1]].choice == 'paper')
            io.in(room).emit('winner', 'SERVER: ' + SOCKETS[clients[0][1]].username + ' wins with PAPER');
        else if (SOCKETS[clients[0][0]].choice == 'rock' && SOCKETS[clients[0][1]].choice == 'sissors')
            io.in(room).emit('winner', 'SERVER: ' + SOCKETS[clients[0][0]].username + ' wins with ROCK');
        else if (SOCKETS[clients[0][0]].choice == 'paper' && SOCKETS[clients[0][1]].choice == 'sissors')
            io.in(room).emit('winner', 'SERVER: ' + SOCKETS[clients[0][1]].username + ' wins with SCISSORS')
        else if (SOCKETS[clients[0][0]].choice == 'paper' && SOCKETS[clients[0][1]].choice == 'rock')
            io.in(room).emit('winner', 'SERVER: ' + SOCKETS[clients[0][0]].username + ' wins with PAPER');
        else if (SOCKETS[clients[0][0]].choice == 'sissors' && SOCKETS[clients[0][1]].choice == 'paper')
            io.in(room).emit('winner', 'SERVER: ' + SOCKETS[clients[0][0]].username + ' wins with SCISSORS')
        else if (SOCKETS[clients[0][0]].choice == 'sissors' && SOCKETS[clients[0][1]].choice == 'rock')
            io.in(room).emit('winner', 'SERVER: ' + SOCKETS[clients[0][1]].username + ' wins with ROCK')
        else
            io.in(room).emit('winner', 'SERVER: Tie game')
        SOCKETS[clients[0][0]].choice = 'none';
        SOCKETS[clients[0][1]].choice = 'none';
    }
}

// helper function that gets the id of a socket
var get_id = (socket) => {
    let info = Object.keys(socket.rooms); // socket.rooms is part of socket.io
    let id = info.shift();

    return id;
}

//check if username is in the database
var isUsernameTaken = function(data, cb){
    db.account.find({username:data.username},function(err, res){
        if (res.length > 0)
            cb(true);
        else
            cb(false);
    });
}

//check if password is same as one saved in database
var isValidPassword = function(data, cb) {
    db.account.find({username:data.username, password:data.password},function(err, res){
        if (res.length > 0)
            cb(true);
        else
            cb(false);
    });
}

//add user to database
var addUser = function(data, cb) {
    db.account.insert({username:data.username, password:data.password},function(err){
        cb();
    });
}

//get deck list from database
var get_deck = function(data, cb) {
    db.deck.find({username:data.username}, function(err, res){
        if (res.length > 0)
            cb(res[0].deck_list); //get deck list from mongodb
        else
            cb(err);
    });
}

const io = require('socket.io')(server, {});
io.sockets.on('connection', (socket) => {

    // put socket in list
    SOCKETS[socket.id] = socket;

    // on disconnect
    socket.on('disconnect', () => {
        
        if (socket.adapter.rooms.lobby) { // if lobby exists ( at least 1 person is in the lobby )
            console.log('(user disconnected...) users in lobby: ' + socket.adapter.rooms.lobby.length);
        } else {
            console.log('(user disconnected...)');
        }
        // let other sockets know of disconnect
        socket.broadcast.to(socket.room).emit('disconnect_', {
            id: socket.id,
        });


        // rooms are left automatically upon disconnect

        // remove socket from 'SOCKETS'
        let i = SOCKETS.indexOf(socket);
        delete SOCKETS[socket.id];
        SOCKETS.splice(i, 1);
    });



    socket.on('show cards', () => {
        console.log("socket.deck: " + socket.deck);
        if (socket.deck)
            socket.emit('display cards', socket.deck);
    });


    // debugging print
    socket.on('print_socket', () => {
        console.group('CURRENT_SOCKET:');
        console.log("Username: " + socket.username)
        console.log('ID: ' + get_id(socket));
        console.log('ROOMS: ' + get_rooms(socket));
        console.log('DECK: ' + socket.deck);
        console.groupEnd();
    });


    // join a game
    socket.on('join_game', () => {
        if (in_room(socket, 'lobby')) {
            let room_to_join = 'room-' + ROOM_NO;
            join_room('lobby', socket, room_to_join);
            console.log('room-' + ROOM_NO + ' length: ' + socket.adapter.rooms['room-' + ROOM_NO].length);
            io.in(room_to_join).emit('get room', room_to_join);
            if (socket.adapter.rooms[room_to_join].length == 2) {
                ++ROOM_NO;
            }
        }
    });

    //handles chat in each room or else default into global lobby chat
    socket.on('chat message', function(msg){
        if (!in_room(socket, 'lobby')) {
            console.log('message: ' + msg);
            let room = get_rooms(socket);
            console.log('Room: '+ room);
            console.log('Username: ' + socket.username)
    
            io.in(room).emit('chat message', msg, socket.username);
        }
        else
            io.in('lobby').emit('chat message', msg, socket.username);
    });    

    // player makes a choice [none, rock, paper, scissors]
    socket.on('game_choice', (data) => {
        // make sure player is in room
        if (in_room(socket, 'lobby') == false) {

            // set the player choice [none, rock, paper, scissors]
            socket.choice = data.choice;
            let rooms = get_rooms(socket);
            io.in(rooms).emit('game_choice', socket.choice);

            check_win(socket);
        }
    });

    //check if password matches username in database
    socket.on('signIn', function(data){
        console.log('SIGN: ' + data.username + "  |  PASS: " + data.password);
        isValidPassword(data, function(res){
            console.log('res: ' + res);
            if (res) {
                socket.emit('signIn-response', {
                    success: true
                });
                //add username to socket object
                socket.username = data.username;
            }
            else {
                socket.emit('signIn-response', {
                    success: false
                });
            }
        });
    });

    socket.on('join lobby', function(data){
        // socket.room = 'lobby';
        socket.join('lobby');
        console.log('(user connected...) users in lobby: ' + socket.adapter.rooms.lobby.length);
        console.log(socket.username +' has joined the lobby')
        socket.emit('join lobby', 'SERVER: Welcome to lobby ' + socket.username);
        // [none, rock, paper, scissors] options
        socket.choice = 'none';

        //Call database upon signin and populate socket.deck
        var cursor = db.collection('deck').find().toArray(function(err, res){
            console.log(res[0].deck_list)
            socket.deck = res[0].deck_list;
        });
    });

    //check if username is present in database
    socket.on('signUp', function(data){
        isUsernameTaken(data, function(res) {
            if (res) {
                socket.emit('signUp-response', {
                    success: false
                });
            }
            else {
                addUser(data, function() {
                socket.emit('signUp-response', {
                    success: true
                });
            });
        }
    });
    });

});

