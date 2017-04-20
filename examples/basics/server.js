var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendfile('index.html');
});

//Whenever someone connects this gets executed
io.on('connection', function(socket){
    console.log('A user connected');
    
    //Send a message after 4 seconds.
    setTimeout(function() {
        socket.send('This is a message sent 4 seconds after connecting.');
        console.log('Sent a message');
    }, 4000);
    
    setTimeout(function(){
        //Sending an object when emmiting an event
        socket.emit('testerEvent', { description: 'A custom event named testerEvent!'});
    }, 8000);
    
    socket.on('clientEvent', function(data) {
        console.log(data);
    });

    //Whenever someone disconnects this piece of code executed
    socket.on('disconnect', function () {
        console.log('A user disconnected');
        io.sockets.emit('broadcast',{ description: 'A client has disconnected!'});
    });

});

http.listen(3000, function(){
    console.log('listening on *:3000');
});
