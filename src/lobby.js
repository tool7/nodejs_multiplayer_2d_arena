const uuidv4 = require('uuid/v4');

global.window = global.document = global;
require('./core/core.server.js');

module.exports = {
  fakeLatency: 0,
  fakeLatencyMessages: [],
  games: {
    'Test game': {
      instance: new GameCore({ gameRoom: 'Test game' }),
      password: null
    }
  },
  currentGameMaxPlayers: 4,
  currentGamePlayerSlots: [],
  playerCount: 0,

  getGames () {
    return Object.keys(this.games)
      .map(name => {
        return {
          name,
          isPasswordLocked: !!this.games[name].password
        };
      });
  },
  
  createGame (data) {
    const { name, password } = data;
  
    if (this.games[name]) {
      return false;
    }  
    
    this.games[name] = {
      instance: new GameCore({ gameRoom: name }),
      password
    };

    return true;
  },
  
  onClientGameRequest (client, data) {
    const game = this.games[data.name];
    if (!game
      || this.playerCount >= this.currentGameMaxPlayers
      || (!!game.password && game.password !== data.password)) {
      return false;
    }
  
    client.gameInstance = game.instance;
  
    const isPlayerAdded = this.putPlayerToFreeSlot(client);
    if (!isPlayerAdded) {
      return false;
    }
    return true;
  },
  
  joinGame (client, gameName) {
    const game = this.games[gameName];
    if (!game) { return false; }
  
    if (!game.instance.isStarted) {
      game.instance.start();
    }
  
    const players = game.instance.players.map(p => {
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        position: p.body.position,
        health: p.health
      };
    });
  
    const connectedPlayer = this.getPlayerById(client);

    client.emit('initial-game-state', { players });

    // Sending to all connected clients except the current client who joins the game
    client.to(gameName).emit('player-connected', {
      id: client.playerId,
      name: client.playerName,
      color: client.playerColor,
      position: connectedPlayer.body.position
    });
  
    return true;
  },
  
  onClientDisconnected (client, gameName) {
    const game = this.games[gameName];
    if (!game) { return; }
  
    this.playerCount--;
  
    let player = this.getPlayerById(client);
    this.freeUpPlayerSlot(player);
  
    game.instance.players = game.instance.players.filter(p => {
      return p.id !== client.playerId;
    });
  
    client.to(gameName).emit('player-disconnected', client.playerId);
  },
  
  onMessage (client, message) {
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
  },
  
  _onMessage (client, message) {
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
  },
  
  onClientInput (client, messageParts) {
    let inputKeys = messageParts[1].split('-');
    var inputSeq = messageParts[2];
    
    let player = this.getPlayerById(client);
    if (!player) { return; }
  
    client.gameInstance.server_handleInput(player, inputKeys, inputSeq);
  },
  
  onClientMouseMove (client, messageParts) {
    let mousePosition = messageParts[1].split('-');
    var mouseSeq = messageParts[2];
    
    let player = this.getPlayerById(client);
    if (!player) { return; }
  
    client.gameInstance.server_handleMousePosition(player, mousePosition, mouseSeq);
  },
  
  onClientFire (client, messageParts) {
    let mousePosition = messageParts[1].split('-');
    var fireTime = messageParts[2];
    
    let player = this.getPlayerById(client);
    if (!player) { return; }
    
    client.gameInstance.server_handleFiring(player, mousePosition, uuidv4(), fireTime);
  },
  
  getPlayerById (client) {
    const { playerId, gameInstance } = client;
  
    let player = gameInstance.players.find(player => {
      return player.id === playerId;
    });
  
    return player;
  },
  
  putPlayerToFreeSlot (client) {
    const player = client.gameInstance.server_addPlayer(client);
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
  },
  
  freeUpPlayerSlot (player) {
    let index = this.currentGamePlayerSlots.indexOf(player);
    this.currentGamePlayerSlots[index] = null;
  },
  
  setPlayerPositionBySlotIndex (player, index) {
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
  }
};
