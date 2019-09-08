const uuidv4 = require('uuid/v4');

module.exports = {
  _io: null,

  init (server, lobby) {
    this._io = require('socket.io')(server);

    this._io.on('connection', socket => {
      socket.playerId = uuidv4();
    
      socket.on('game-request', data => {    
        const isGameAvailable = lobby.onClientGameRequest(socket, data);
    
        if (isGameAvailable) {
          socket.join(data.name);
          socket.emit('connection-success', { id: socket.playerId });
        }
        else {
          socket.emit('connection-fail');
          return;
        }
    
        socket.on('player-ready', data => {
          const isPlayerReadySet = lobby.setPlayerReady(socket, data.gameName);
          if (!isPlayerReadySet) {
            socket.emit('connection-fail');
          }
        });
    
        socket.on('init-complete', () => {
          const isJoined = lobby.joinGame(socket, data.name);
          if (!isJoined) {
            socket.emit('connection-fail');
          }
        });
    
        socket.on('message', m => {
          lobby.onMessage(socket, m);
        });
    
        socket.on('disconnect', () => {
          console.log("socket.io:: player " + socket.playerId + " disconnected");
      
          lobby.onClientDisconnected(socket, data.name);
        });
      });
    
      console.log("socket.io:: player " + socket.playerId + " connected");
    });
  },

  emit (gameRoom, event, data) {
    this._io.to(gameRoom).emit(event, data);
  }
};
