var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

server.listen(3030, function () {
  console.log('Server listening at port %d', 3030);
});

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/client.html');
});


io.on('connection', function (socket) {
  socket.on('sound', function (stream) {
    console.log('receiving data '+data);
    socket.emit('sound',stream);
  });
});