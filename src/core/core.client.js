// Each frame is run every 16ms (~ 60fps)

const PICKUP_TYPE = {
  Health: 'health',
  Shield: 'shield'
};

class GameCore extends SimpleEventEmitter {

  constructor (socket, playerId, playerName, playerColor) {
    super();
    
    this.socket = socket;
    this.playerId = playerId;
    this.playerName = playerName;
    this.playerColor = playerColor;

    this.sharedFunctions = new SharedFunctions();
    this.isGameStarted = false;

    this.terrain = { width: 1000, height: 800 };

    this.updateDeltaTime = new Date().getTime();
    this.updateDeltaTimeLast = new Date().getTime();

    this.serverTime = 0;
    this.serverUpdates = [];
    this.otherPlayers = {};
    this.projectiles = {};
    this.pathways = {};
    this.pickups = {};

    this.keyboard = new THREEx.KeyboardState();
    this.mouse = { position: {} };
    this.inputSeq = 0;
    this.angleSeq = 0;

    this.client_createNetConfiguration();
    // this.client_createDebugGUI();

    this.gameHtmlElement = document.getElementById("game");
    this.app = new PIXI.Application({
      width: this.terrain.width,
      height: this.terrain.height,
      antialias: true,
      transparent: false,
      resolution: 1
    });
    this.gameHtmlElement.appendChild(this.app.view);

    this.drawMap();
    this.initSounds();
    this.initGame();
  }

  drawMap () {
    const bgTexture = PIXI.loader.resources["assets/game_background.png"].texture;
    const croppedBgTexture = new PIXI.Texture(bgTexture, new PIXI.Rectangle(0, 0, this.terrain.width, this.terrain.height));
    const background = new PIXI.Sprite(croppedBgTexture);

    const generateStarsEffect = () => {
      let stars = [];

      for (let i = 0; i < 50; i++) {
        stars.push({
          pixiGraphics: new PIXI.Graphics(),
          radius: this.sharedFunctions.getRandomNumberInRange(1, 1.6),
          x: +this.sharedFunctions.getRandomNumberInRange(0, this.terrain.width).toFixed(),
          y: +this.sharedFunctions.getRandomNumberInRange(0, this.terrain.height).toFixed(),
          increaseAmount: this.sharedFunctions.getRandomNumberInRange(0.01, 0.08)
        });

        this.app.stage.addChild(stars[i].pixiGraphics);
      }

      this.app.ticker.add(() => {
        stars.forEach(s => {
          if (s.radius < 1) {
            s.increaseAmount = -s.increaseAmount;
          }
          if (s.radius > 1.6) {
            s.increaseAmount = -s.increaseAmount;
          }
          s.radius += s.increaseAmount;
  
          s.pixiGraphics.clear();
          s.pixiGraphics.lineStyle(0);
          s.pixiGraphics.beginFill(0xffffff, 1);
          s.pixiGraphics.drawCircle(s.x, s.y, s.radius);
          s.pixiGraphics.endFill();
        });
      });
    };

    this.app.stage.addChild(background);
    generateStarsEffect();
  }

  initSounds () {
    createjs.Sound.registerSound("sounds/laser_2.mp3", "basic-shot");
    createjs.Sound.registerSound("sounds/thrust.mp3", "ship-thrust");
    createjs.Sound.registerSound("sounds/ship_explosion.mp3", "ship-explosion");
    createjs.Sound.registerSound("sounds/ship_hit.mp3", "ship-hit");
    createjs.Sound.registerSound("sounds/pickup_spawn.mp3", "pickup-spawn");
    createjs.Sound.registerSound("sounds/player_heal.mp3", "player-heal");
    createjs.Sound.registerSound("sounds/player_shield_boost.mp3", "player-shield-boost");
  }

  initGame () {
    this.self = new Player(this.app, this.playerName, this.playerColor);
    this.self.id = this.playerId;

    this.client_initConnectionHandlers();
    this.client_createPingTimer();
    this.client_initMouseMoveHandler();
    this.client_initMouseClickHandler();

    this.initPhysicsSimulation();
  }


  // ========== CORE FUNCTIONS ==========
  initPhysicsSimulation () {
    this.physicsUpdateId = setInterval(() => {
      if (this.clientPrediction && this.self.isAlive) {
        this.client_prediction();
      }
      this.client_updateProjectilesPositions();
    }, 15);
  }

  start () {
    this.isGameStarted = true;

    const startTime = new Date().getTime();
    this.client_update(startTime);
  }

  stop () {
    this.isGameStarted = false;

    clearInterval(this.physicsUpdateId);
    window.cancelAnimationFrame(this.updateId);
  }

  destroy () {
    this.app.destroy();
    this.gameHtmlElement.innerHTML = null;

    this.stop();
  }
  // ====================================

  client_createNetConfiguration () {
    this.netLatency = 0.001;
    this.netPing = 0.001;
    this.netOffset = 100;   // Milliseconds
    this.fps = 0;

    this.serverUpdatesMaxLength = 60;

    this.clientPrediction = true;
    this.entityInterpolation = false;
    this.fakeLag = 0;
  }

  client_createDebugGUI () {
    this.gui = new dat.GUI();

    let generalSettings = this.gui.addFolder('General');
    generalSettings.add(this, 'clientPrediction').name('client prediction');
    generalSettings.add(this, 'entityInterpolation').name('entity interpolation');

    let connectionSettings = this.gui.addFolder('Connection');
    connectionSettings.add(this, 'netOffset').name('net offset').step(1).min(10).listen();
    connectionSettings.add(this, 'netLatency').name('latency').listen();
    // connectionSettings.add(this, 'netPing').name('ping').listen();
    // connectionSettings.add(this, 'fps').listen();

    // let fakeLagControl = connectionSettings.add(this, 'fakeLag').name('fake lag').step(0.001).min(0).listen();
    // fakeLagControl.onChange(value => {
    //   this.socket.send(`l.${ value }`);
    // });

    connectionSettings.open();
    generalSettings.open();
  }

  client_initConnectionHandlers () {
    this.socket.on('initial-game-state', this.client_initGameState.bind(this));
    this.socket.on('player-connected', this.client_onPlayerConnected.bind(this));
    this.socket.on('player-disconnected', this.client_onPlayerDisconnected.bind(this));
    this.socket.on('server-update', this.client_onServerUpdateReceived.bind(this));
    this.socket.on('message', this.client_onServerMessage.bind(this));
    this.socket.on('projectile-created', this.client_onProjectileCreated.bind(this));
    this.socket.on('projectile-destroyed', this.client_onProjectileDestroyed.bind(this));
    this.socket.on('pickup-spawned', this.client_onPickupSpawned.bind(this));
    this.socket.on('pickup-taken', this.client_onPickupTaken.bind(this));
    this.socket.on('player-shot', this.client_onPlayerShot.bind(this));
    this.socket.on('game-end', this.client_onGameEnd.bind(this));

    this.socket.emit('init-complete');
  }

  client_createPingTimer () {
    setInterval(() => {
      let lastPingTime = new Date().getTime() - this.fakeLag;
      this.socket.send(`p.${ lastPingTime }`);
    }, 1000);
  }

  client_onPing (data) {
    this.netPing = new Date().getTime() - parseFloat(data);
    this.netLatency = this.netPing / 2;
  }

  client_onServerMessage (data) {
    let messageParts = data.split('.');
    let messageType = messageParts[0];

    switch (messageType) {
      case 'p':
        this.client_onPing(messageParts[1]);
        break;
    }
  }

  client_onServerUpdateReceived (data) {
    const decodedServerData = this.sharedFunctions.decodeWorldSnapshotData(data);

    this.serverTime = decodedServerData.time - this.netOffset;
    this.serverUpdates.push(decodedServerData);

    if (this.serverUpdates.length > this.serverUpdatesMaxLength) {
      this.serverUpdates.splice(0, 1);
    }

    if (this.self.isAlive) {
      this.client_processInputPredictionCorrection();
      this.client_processAnglePredictionCorrection();
    }
  }

  client_processInputPredictionCorrection () {
    if (!this.serverUpdates.length) { return; }

    let latestServerData = this.serverUpdates[this.serverUpdates.length - 1];
    let selfPlayerData = latestServerData.players[this.self.id];

    let selfPositionOnServer = selfPlayerData.position;
    let selfLastInputSeqOnServer = selfPlayerData.lastInputSeq;
    
    if (!selfLastInputSeqOnServer) { return; }

    let lastInputSeqIndex = null;
    for (let i = 0; i < this.self.inputs.length; i++) {
      if (this.self.inputs[i].seq === selfLastInputSeqOnServer) {
        lastInputSeqIndex = i;
        break;
      }
    }

    this.self.moveTo(selfPositionOnServer);

    if (!lastInputSeqIndex) { return; }

    this.self.inputs.splice(0, lastInputSeqIndex + 1);    
    this.self.lastInputSeq = lastInputSeqIndex;
  }

  client_processAnglePredictionCorrection () {
    if (!this.serverUpdates.length) { return; }

    let latestServerData = this.serverUpdates[this.serverUpdates.length - 1];
    let selfPlayerData = latestServerData.players[this.self.id];

    let selfAngleOnServer = selfPlayerData.rotation;
    let selfLastAngleSeqOnServer = selfPlayerData.lastAngleSeq;
    
    if (!selfLastAngleSeqOnServer) { return; }

    let lastAngleSeqIndex = null;
    for (let i = 0; i < this.self.angles.length; i++) {
      if (this.self.angles[i].seq === selfLastAngleSeqOnServer) {
        lastAngleSeqIndex = i;
        break;
      }
    }

    this.self.rotateTo(selfAngleOnServer);

    if (!lastAngleSeqIndex) { return; }

    this.self.angles.splice(0, lastAngleSeqIndex + 1);
    this.self.lastAngleSeq = lastAngleSeqIndex;
  }

  client_initGameState (data) {
    let selfData = data.players.find(p => p.id === this.self.id);
    let otherPlayersData = data.players.filter(p => p.id !== this.self.id);

    this.self.setPosition(selfData.position);

    this.otherPlayers = otherPlayersData.reduce((obj, p) => {
      const player = new Player(this.app, p.name, p.color);
      player.setPosition(p.position);

      obj[p.id] = player;
      return obj;
    }, {});

    this.pathways = data.pathways.reduce((obj, p) => {
      const pathway = new Pathway(
        this.app,
        p.wormholeAPosition,
        p.wormholeBPosition,
        p.color
      );

      obj[p.id] = pathway;
      return obj;
    }, {});
  }

  client_onGameEnd (winnerId) {
    let gameEndMessage = "";

    if (this.self.id === winnerId) {
      gameEndMessage = "You win!"
    }
    else if (this.otherPlayers[winnerId]) {
      gameEndMessage = `${this.otherPlayers[winnerId].name} is winner.`;
    }

    this.dispatch("game-end-message", gameEndMessage);

    const intervalId = setInterval(() => {
      this.stop();
      clearInterval(intervalId);
    }, 3000);
  }

  client_onPlayerConnected (data) {
    const { id, position, name, color } = data;
    const player = new Player(this.app, name, color);
    player.setPosition(position);

    this.otherPlayers[id] = player;
  }

  client_onPlayerDisconnected (id) {
    const player = this.otherPlayers[id];
    player.destroy();

    delete this.otherPlayers[id];
  }

  client_onProjectileCreated (data) {
    const projectile = new Projectile(this, data);
    this.projectiles[projectile.id] = projectile;
  }

  client_onProjectileDestroyed (id) {
    const projectile = this.projectiles[id];
    projectile.destroy();

    delete this.projectiles[id];
  }

  client_onPickupSpawned (data) {
    const { id, type, position } = data;
    const pickup = new Pickup(this.app, type, position);

    this.pickups[id] = pickup;
  }

  client_onPickupTaken (data) {
    const { id, playerId } = data;
    const pickup = this.pickups[id];
  
    if (this.self.id === playerId) {
      this.client_handlePickupTaken(pickup.type, this.self);
    }
    else if (this.otherPlayers[playerId]) {
      this.client_handlePickupTaken(pickup.type, this.otherPlayers[playerId]);
    }

    pickup.destroy();
    delete this.pickups[id];
  }

  client_handlePickupTaken (type, player) {
    switch (type) {
      case PICKUP_TYPE.Health:
        const health = Math.min(player.health + 15, 100);
        player.onHealthPickupTaken(health);
        break;
      case PICKUP_TYPE.Shield:
        player.onShieldPickupTaken();
        break;
    }
  }

  client_onPlayerShot (player) {
    if (this.self.id === player.id) {
      this.self.onShot(player.health);
      return;
    }
    
    const otherPlayer = this.otherPlayers[player.id];
    if (otherPlayer) {
      otherPlayer.onShot(player.health);
    }
  }

  client_initMouseMoveHandler () {
    this.app.view.onmousemove = event => {
      this.mouse.position.x = event.x;
      this.mouse.position.y = event.y;
    };
  }

  client_initMouseClickHandler () {
    this.app.view.onmousedown = () => {
      if (!this.isGameStarted) { return; }

      this.client_handleMouseClick();
    };
  }

  client_update (time) {
    this.updateDeltaTime = (time - this.updateDeltaTimeLast) / 1000;
    this.updateDeltaTimeLast = time;
    this.fps = (1 / this.updateDeltaTime).toFixed();

    if (this.self.isAlive) {
      this.client_handleInput();
      this.client_handleMouseMove();
    }

    this.client_updatePlayersPositions();
    this.client_updateOtherPlayersThrustEffect();

    this.updateId = window.requestAnimationFrame(this.client_update.bind(this));
  }

  client_prediction () {
    this.sharedFunctions.processPlayerInput(this.self);
    this.sharedFunctions.processPlayerAngle(this.self);
    this.sharedFunctions.limitPlayerPositionToMapBounds(this.self);

    this.self.update();
  }

  client_handleInput () {
    let input = null;

    if (this.keyboard.pressed('W')) {
      input = 'd+';
    } else {
      input = 'd-';
    }

    if (!input) { return; }

    this.inputSeq++;

    this.self.inputs.push({
      value: input,
      seq: this.inputSeq
    });

    const inputPacket = `i.${ input }.${ this.inputSeq }`;
    this.socket.send(inputPacket);
  }

  client_handleMouseMove () {
    const { x, y } = this.mouse.position;
    const angle = this.sharedFunctions.angleBetweenPoints(this.self.body.position, { x, y });

    this.angleSeq++;

    this.self.angles.push({
      value: angle,
      seq: this.angleSeq
    });

    const mousePacket = `m.${ x }-${ y }.${ this.angleSeq }`;
    this.socket.send(mousePacket);
  }

  client_handleMouseClick () {
    const { x, y } = this.mouse.position;

    const projectilePacket = `f.${ x }-${ y }`;
    this.socket.send(projectilePacket);
  }

  client_updatePlayersPositions () {
    if (!this.serverUpdates.length) { return; }

    let target = null;
    let previous = null;

    for (let i = 0; i < this.serverUpdates.length - 1; i++) {
      let point = this.serverUpdates[i];
      let nextPoint = this.serverUpdates[i + 1];

      if (this.serverTime > point.time && this.serverTime < nextPoint.time) {
        target = nextPoint;
        previous = point;
        break;
      }
    }

    if (!target || !previous) { return; }

    let difference = this.serverTime - previous.time;
    let maxDifference = (target.time - previous.time).toFixed(3);
    let timePoint = (difference / maxDifference).toFixed(3);

    if (isNaN(timePoint)) { timePoint = 0; }
    if (timePoint < 0 || timePoint > 1) { timePoint = 0; }
    if (timePoint === -Infinity) { timePoint = 0; }
    if (timePoint === Infinity) { timePoint = 0; }

    Object.keys(this.otherPlayers).forEach(id => {
      const player = this.otherPlayers[id];

      const previousPlayerState = previous.players[id];
      const targetPlayerState = target.players[id];

      if (!previousPlayerState || !targetPlayerState) { return; }

      if (this.entityInterpolation) {
        const interpolatedPosition = this.v_lerp(previousPlayerState.position, targetPlayerState.position, timePoint);
        player.moveTo(interpolatedPosition);
      }
      else {
        player.moveTo(targetPlayerState.position);
      }

      player.rotateTo(targetPlayerState.rotation);
    });

    // Updating positions of local player if not predicting
    if (!this.clientPrediction) {
      let targetPlayerState = target.players[this.self.id];

      this.self.moveTo(targetPlayerState.position);
      this.self.rotateTo(targetPlayerState.rotation);
    }
  }

  client_updateOtherPlayersThrustEffect () {
    if (!this.serverUpdates.length) { return; }

    const latestServerData = this.serverUpdates[this.serverUpdates.length - 1];

    Object.keys(this.otherPlayers).forEach(id => {
      const playerData = latestServerData.players[id];
      const player = this.otherPlayers[id];

      if (!playerData) { return; }

      player.updateThrustEffect(playerData.thrustEffect);
    });
  }

  client_updateProjectilesPositions () {
    Object.keys(this.projectiles).forEach(id => {
      this.projectiles[id].move();
    });
  }

  lerp (p, n, t) {
    let _t = Number(t);
    _t = (Math.max(0, Math.min(1, _t))).toFixed(3);
    let result = (p + _t * (n - p)).toFixed(3);
    return parseInt(result);
  }
  
  v_lerp (v, tv, t) {
    return {
      x: this.lerp(v.x, tv.x, t),
      y: this.lerp(v.y, tv.y, t)
    };
  }
}
