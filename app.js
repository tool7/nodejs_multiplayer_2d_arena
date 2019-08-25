const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const uuidv4 = require('uuid/v4');
const bodyParser = require('body-parser');

const lobby = require('./src/lobby.js')(io);

app.use('/', express.static(__dirname));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/api/games', (req, res) => {
  const games = lobby.getGames();

  res.status(200).send(games);
});

app.post('/api/games', (req, res) => {
  const isSuccess = lobby.createGame(req.body);

  isSuccess ? res.sendStatus(200) : res.sendStatus(400);
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});

io.on('connection', socket => {
  socket.playerId = uuidv4();

  socket.on('game-request', data => {
    socket.playerName = data.playerName;

    const isGameAvailable = lobby.onClientGameRequest(socket, data);

    if (isGameAvailable) {
      socket.join(data.name);
      socket.emit('connection-success', { id: socket.playerId });
    }
    else {
      socket.emit('connection-fail');
      return;
    }

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
