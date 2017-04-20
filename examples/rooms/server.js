var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendfile('index.html');
});

var roomno = 0;

//Whenever someone connects this gets executed
io.on('connection', function(socket){
    console.log('A user connected');

    //Increase roomno if 2 clients are present in a room.
    if(io.nsps['/'].adapter.rooms["room-"+roomno] && io.nsps['/'].adapter.rooms["room-"+roomno].length > 1)
        roomno++;
    
    //Join the room
    socket.join("room-"+roomno);

    //Announce the joining
    io.sockets.in("room-"+roomno).emit('connectToRoom', "You are in room no. " + roomno);

    //Whenever someone disconnects this piece of code executed
    socket.on('disconnect', function () {
        console.log('A user disconnected');
        socket.leave("room-"+roomno);
    });

});

http.listen(3000, function(){
    console.log('listening on *:3000');
});
