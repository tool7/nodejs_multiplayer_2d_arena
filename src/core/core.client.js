// each frame is run every 16ms (~ 60fps)

class GameCore {

  constructor (socket, playerId, playerName, playerColor) {
    this.socket = socket;
    this.playerId = playerId;
    this.playerName = playerName;
    this.playerColor = playerColor;

    this.sharedFunctions = new SharedFunctions();
    this.gameReady = false;
    this.isPlayerAlive = true;

    this.terrain = {
      width: 1000,
      height: 800
    };

    this.updateDeltaTime = new Date().getTime();
    this.updateDeltaTimeLast = new Date().getTime();

    this.serverTime = 0;
    this.serverUpdates = [];
    this.otherPlayers = {};
    this.projectiles = {};
    this.pathways = {};

    this.keyboard = new THREEx.KeyboardState();
    this.mouse = { position: {} };
    this.inputSeq = 0;
    this.angleSeq = 0;

    this.client_createNetConfiguration();
    // this.client_createDebugGUI();

    this.app = new PIXI.Application({
      width: this.terrain.width,
      height: this.terrain.height,
      antialias: true,
      transparent: false,
      resolution: 1
    });

    const gameContainer = document.getElementById("game");
    gameContainer.appendChild(this.app.view);

    this.loadTextures();
    this.loadSounds();
  }

  loadTextures () {
    PIXI.loader.add([
      "assets/wormhole.png",
      "assets/basic_projectile.png",
      "assets/background.jpg"
    ])
    .load(this.onTexturesLoaded.bind(this));
  }

  loadSounds () {
    createjs.Sound.registerSound("sounds/laser_2.mp3", "basic-shot");
  }

  onTexturesLoaded () {
    const bgTexture = PIXI.loader.resources["assets/background.jpg"].texture;
    const croppedBgTexture = new PIXI.Texture(bgTexture, new PIXI.Rectangle(0, 0, this.terrain.width, this.terrain.height));
    const background = new PIXI.Sprite(croppedBgTexture);

    this.app.stage.addChild(background);

    this.self = new Player(this.app, this.playerName, this.playerColor);
    this.self.id = this.playerId;
    this.self.registerEventListener("player-death", () => {
      this.isPlayerAlive = false;
    });

    this.client_initConnectionHandlers();
    this.client_createPingTimer();
    this.client_initMouseMoveHandler();
    this.client_initMouseClickHandler();

    this.initPhysicsSimulation();

    this.gameReady = true;
  }


  // ========== CORE FUNCTIONS ==========
  initPhysicsSimulation () {
    setInterval(() => {
      if (this.clientPrediction && this.isPlayerAlive) {
        this.client_prediction();
      }
      this.client_updateProjectilesPositions();
    }, 15);
  }

  start () {
    const startTime = new Date().getTime();
    this.client_update(startTime);
  }

  stopUpdate () {
    window.cancelAnimationFrame(this.updateId);
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
    this.socket.on('player-shot', this.client_onPlayerShot.bind(this));

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

    if (this.isPlayerAlive) {
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

    this.self.setInitialPosition(selfData.position);

    this.otherPlayers = otherPlayersData.reduce((obj, p) => {
      const player = new Player(this.app, p.name, p.color);
      player.setInitialPosition(p.position);
      player.setHealth(p.health);

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

  client_onPlayerConnected (data) {
    const player = new Player(this.app, data.name, data.color);
    player.setInitialPosition(data.position);

    this.otherPlayers[data.id] = player;
  }

  client_onPlayerDisconnected (id) {
    const player = this.otherPlayers[id];
    player.remove();

    delete this.otherPlayers[id];
  }

  client_onProjectileCreated (data) {
    const projectile = new Projectile(this, data);
    this.projectiles[projectile.id] = projectile;

    // TODO: place somewhere else?
    createjs.Sound.play("basic-shot");
  }

  client_onProjectileDestroyed (id) {
    const projectile = this.projectiles[id];
    projectile.remove();

    delete this.projectiles[id];
  }

  client_onPlayerShot (player) {
    if (this.self.id === player.id) {
      this.self.setHealth(player.health);
      return;
    }
    
    const otherPlayer = this.otherPlayers[player.id];
    if (otherPlayer) {
      otherPlayer.setHealth(player.health);
    }
  }

  client_initMouseMoveHandler () {
    this.app.view.onmousemove = event => {
      this.mouse.position.x = event.x;
      this.mouse.position.y = event.y;
    };
  }

  client_initMouseClickHandler () {
    this.app.view.onmousedown = event => {
      const x = event.x;
      const y = event.y;

      const projectilePacket = `f.${ x }-${ y }`;
      this.socket.send(projectilePacket);
    };
  }

  client_update (time) {
    this.updateDeltaTime = (time - this.updateDeltaTimeLast) / 1000;
    this.updateDeltaTimeLast = time;
    this.fps = (1 / this.updateDeltaTime).toFixed();

    if (this.gameReady) {
      if (this.isPlayerAlive) {
        this.client_handleInput();
        this.client_handleMouseMove();
      }

      this.client_updatePlayersPositions();
    }

    this.updateId = window.requestAnimationFrame(this.client_update.bind(this));
  }

  client_prediction () {
    this.sharedFunctions.processPlayerInput(this.self);
    this.sharedFunctions.processPlayerAngle(this.self);

    this.self.update();
  }

  client_handleInput () {
    let input = null;

    if (this.keyboard.pressed('W') || this.keyboard.pressed('up')) {
      input = 'f';
    }

    if (input) {
      this.inputSeq++;

      this.self.inputs.push({
        value: input,
        seq: this.inputSeq
      });

      const inputPacket = `i.${ input }.${ this.inputSeq }`;
      this.socket.send(inputPacket);
    }
  }

  client_handleMouseMove () {
    let x = this.mouse.position.x;
    let y = this.mouse.position.y;
    let angle = this.sharedFunctions.angleBetweenPoints(this.self.body.position, { x, y });

    this.angleSeq++;

    this.self.angles.push({
      value: angle,
      seq: this.angleSeq
    });

    const mousePacket = `m.${ x }-${ y }.${ this.angleSeq }`;
    this.socket.send(mousePacket);
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
