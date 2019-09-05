const express = require('express');
const app = express();
const server = require('http').Server(app);
const bodyParser = require('body-parser');
const lobby = require('./src/lobby.js');

require('./src/connection_service').init(server, lobby);

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
