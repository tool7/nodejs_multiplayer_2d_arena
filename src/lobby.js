const uuidv4 = require('uuid/v4');

global.window = global.document = global;
require('./core/core.server.js');

module.exports = io => {
  this.io = io;

  this.fakeLatency = 0;
  this.fakeLatencyMessages = [];
  this.games = {
    'Test game': new GameCore({ io: this.io, gameRoom: 'Test game' })
  };
  this.currentGameMaxPlayers = 4;
  this.currentGamePlayerSlots = [];
  this.playerCount = 0;

  this.getGames = function () {
    return Object.keys(this.games);
  };
  
  this.createGame = function (data) {
    const { name, password } = data;
  
    if (this.games[name]) {
      return false;
    }
  
    // TODO: Implement password functionality
  
    
    this.games[name] = new GameCore({ io: this.io, gameRoom: name });
    return true;
  };
  
  this.onClientGameRequest = function (client, gameName) {
    const game = this.games[gameName];
    if (!game || this.playerCount >= this.currentGameMaxPlayers) { return false; }
  
    client.game = game;
  
    const isPlayerAdded = this.putPlayerToFreeSlot(client);
    if (!isPlayerAdded) {
      return false;
    }
    return true;
  };
  
  this.joinGame = function (client, gameName) {
    const game = this.games[gameName];
    if (!game) { return false; }
  
    if (!game.isStarted) {
      game.start();
    }
  
    const players = game.players.map(p => {
      return {
        id: p.id,
        position: p.body.position,
        health: p.health
      };
    });
  
    const connectedPlayer = this.getPlayerById(client);

    client.emit('initial-game-state', { players });

    // Sending to all connected clients except the current client who joins the game
    client.to(gameName).emit('player-connected', {
      id: client.playerId,
      position: connectedPlayer.body.position
    });
  
    return true;
  };
  
  this.onClientDisconnected = function (client, gameName) {
    const game = this.games[gameName];
    if (!game) { return; }
  
    this.playerCount--;
  
    let player = this.getPlayerById(client);
    this.freeUpPlayerSlot(player);
  
    game.players = game.players.filter(p => {
      return p.id !== client.playerId;
    });
  
    client.to(gameName).emit('player-disconnected', client.playerId);
  };
  
  this.onMessage = function (client, message) {
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
  
  this._onMessage = function (client, message) {
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
  
  this.onClientInput = function (client, messageParts) {
    let inputKeys = messageParts[1].split('-');
    var inputSeq = messageParts[2];
    
    let player = this.getPlayerById(client);
    if (!player) { return; }
  
    client.game.server_handleInput(player, inputKeys, inputSeq);
  };
  
  this.onClientMouseMove = function (client, messageParts) {
    let mousePosition = messageParts[1].split('-');
    var mouseSeq = messageParts[2];
    
    let player = this.getPlayerById(client);
    if (!player) { return; }
  
    client.game.server_handleMousePosition(player, mousePosition, mouseSeq);
  };
  
  this.onClientFire = function (client, messageParts) {
    let mousePosition = messageParts[1].split('-');
    var fireTime = messageParts[2];
    
    let player = this.getPlayerById(client);
    if (!player) { return; }
    
    client.game.server_handleFiring(player, mousePosition, uuidv4(), fireTime);
  };
  
  this.getPlayerById = function (client) {
    const { playerId, game } = client;
  
    let player = game.players.find(player => {
      return player.id === playerId;
    });
  
    return player;
  };
  
  this.putPlayerToFreeSlot = function (client) {
    const player = client.game.server_addPlayer(client.playerId);
    let slotIndex = -1;
  
    for (let i = 0; i < this.currentGameMaxPlayers; i++) {
      if (!this.currentGamePlayerSlots[i]) {
        this.currentGamePlayerSlots[i] = player;
        slotIndex = i;
        break;
      }
    }
  
    if (slotIndex === -1) {
      return false;
    }
  
    this.setPlayerPositionBySlotIndex(player, slotIndex);
    this.playerCount++;
  
    return true;
  };
  
  this.freeUpPlayerSlot = function (player) {
    let index = this.currentGamePlayerSlots.indexOf(player);
    this.currentGamePlayerSlots[index] = null;
  };
  
  this.setPlayerPositionBySlotIndex = function (player, index) {
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

  return this;
};
