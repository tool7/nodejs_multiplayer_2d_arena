const uuidv4 = require('uuid/v4');

let lobby = module.exports = {
  fakeLatency: 0,
  fakeLatencyMessages: [],
  currentGame: null,
  currentGameMaxPlayers: 4,
  currentGamePlayerSlots: [],
  playerCount: 0
};

global.window = global.document = global;
require('./core/core.server.js');

// TODO: refactor because of multiple games possibility
lobby.onClientConnected = function (client) {
  if (!this.currentGame) {
    this.currentGame = new GameCore({ id: uuidv4(), players: [] });
    this.currentGame.start();
  }

  if (this.playerCount >= this.currentGameMaxPlayers) {
    client.emit('game-full');
    return false;
  }
  
  const addedPlayer = this.currentGame.server_addPlayer(client);
  const slotIndex = this.putPlayerToFreeSlot(addedPlayer);

  this.setPlayerPositionBySlotIndex(addedPlayer, slotIndex);
  this.playerCount++;

  client.game = this.currentGame;

  const players = this.currentGame.players.map(p => {
    return {
      id: p.instance.playerId,
      position: p.body.position,
      health: p.health
    };
  });

  const connectedPlayer = this.getPlayerById(client.playerId);

  client.emit('initial-game-state', { players });
  client.broadcast.emit('player-connected', {
    id: client.playerId,
    position: connectedPlayer.body.position
  });

  return true;
};

lobby.onClientDisconnected = function (client) {
  this.playerCount--;

  let player = this.getPlayerById(client.playerId);
  this.freeUpPlayerSlot(player);

  this.currentGame.players = this.currentGame.players.filter(p => {
    return p.instance.playerId !== client.playerId;
  });

  client.broadcast.emit('player-disconnected', client.playerId);
};

lobby.onMessage = function (client, message) {
  let messageParts = message.split('.');
  let messageType = messageParts[0];

  if (this.fakeLatency && ['i', 'm'].includes(messageType)) {
    if (!this.fakeLatencyMessages) {
      this.fakeLatencyMessages = [];
    }
    this.fakeLatencyMessages.push({ client: client, message: message });

    setTimeout(() => {
      if (this.fakeLatencyMessages.length) {
        this._onMessage(this.fakeLatencyMessages[0].client, this.fakeLatencyMessages[0].message);
        this.fakeLatencyMessages.splice(0, 1);
      }
    }, this.fakeLatency);
  }
  else {
    this._onMessage(client, message);
  }
};

lobby._onMessage = function (client, message) {
  let messageParts = message.split('.');
  let messageType = messageParts[0];

  switch (messageType) {
    case 'i':
      this.onClientInput(client, messageParts);
      break;
    case 'm':
      this.onClientMouseMove(client, messageParts);
      break;
    case 'f':
      this.onClientFire(client, messageParts);
      break;
    case 'p':
      client.send('p.' + messageParts[1]);
      break;
    case 'l':
      this.fakeLatency = parseFloat(messageParts[1]);
      break;
  }
};

lobby.onClientInput = function (client, messageParts) {
  let inputKeys = messageParts[1].split('-');
  var inputSeq = messageParts[2];
  
  let player = this.getPlayerById(client.playerId);
  if (!player) { return; }

  client.game.server_handleInput(player, inputKeys, inputSeq);
};

lobby.onClientMouseMove = function (client, messageParts) {
  let mousePosition = messageParts[1].split('-');
  var mouseSeq = messageParts[2];
  
  let player = this.getPlayerById(client.playerId);
  if (!player) { return; }

  client.game.server_handleMousePosition(player, mousePosition, mouseSeq);
};

lobby.onClientFire = function (client, messageParts) {
  let mousePosition = messageParts[1].split('-');
  var fireTime = messageParts[2];
  
  let player = this.getPlayerById(client.playerId);
  if (!player) { return; }
  
  client.game.server_handleFiring(player, mousePosition, uuidv4(), fireTime);
};

lobby.getPlayerById = function (id) {
  let player = this.currentGame.players.find(player => {
    return player.instance.playerId === id;
  });

  return player;
};

lobby.putPlayerToFreeSlot = function (player) {
  for (let i = 0; i < this.currentGameMaxPlayers; i++) {
    if (!this.currentGamePlayerSlots[i]) {
      this.currentGamePlayerSlots[i] = player;
      return i;
    }
  }
  return -1;
};

lobby.freeUpPlayerSlot = function (player) {
  let index = this.currentGamePlayerSlots.indexOf(player);
  this.currentGamePlayerSlots[index] = null;
};

lobby.setPlayerPositionBySlotIndex = function (player, index) {
  // TODO: implement better way of setting player's initial position
  switch (index) {
    case 0:
      player.setInitialPosition({ x: 60, y: 60 });   
      break;
    case 1:
      player.setInitialPosition({ x: 800, y: 60 });   
      break;
    case 2:
      player.setInitialPosition({ x: 60, y: 600 });   
      break;
    case 3:
      player.setInitialPosition({ x: 800, y: 600 });   
      break;
  }
};
