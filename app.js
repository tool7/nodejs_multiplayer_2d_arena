const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const uuidv4 = require('uuid/v4');

const lobby = require('./src/lobby.js');

app.use('/', express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});

io.on('connection', socket => {
  
  socket.playerId = uuidv4();
  socket.emit('onconnected', { id: socket.playerId });

  const gameFound = lobby.onClientConnected(socket);

  console.log("socket.io:: player " + socket.playerId + " connected");

  socket.on('disconnect', () => {
    console.log("socket.io:: player " + socket.playerId + " disconnected");

    if (gameFound) {
      lobby.onClientDisconnected(socket);
    }
  });

  if (gameFound) {
    socket.on('message', m => {
      lobby.onMessage(socket, m);
    });
  }
});
