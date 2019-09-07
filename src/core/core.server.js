// Each frame is run every 45ms (~ 22fps)

const SAT = require('sat');
const uuidv4 = require('uuid/v4');

const connectionService = require('../connection_service');

require('./core.shared.js');
require('./../entities/player.server.js');
require('./../entities/projectile.server.js');
require('./../entities/pathway.server.js');

(function () {
  const frameTime = 45;     // Milliseconds
  let lastTime = 0;

  window.requestAnimationFrame = function (callback) {
    let currentTime = Date.now();
    let timeToCall = Math.max(0, frameTime - (currentTime - lastTime));
    let id = window.setTimeout(function () { callback(currentTime + timeToCall); }, timeToCall);
    lastTime = currentTime + timeToCall;
    return id;
  };

  window.cancelAnimationFrame = function (id) { clearTimeout(id); };
}());

class GameCore {

  constructor (data) {
    this.gameRoom = data.gameRoom;
    this.requiredPlayersCount = data.requiredPlayersCount;

    this.sharedFunctions = new SharedFunctions();
    this.isGameStarted = false;
    this.players = [];
    this.projectiles = [];
    this.pathways = [
      new Pathway(uuidv4(), { x: 200, y: 200 }, { x: 800, y: 500 }, 0x00ff00),
      new Pathway(uuidv4(), { x: 100, y: 700 }, { x: 900, y: 100 }, 0xffffff)
    ];
  }

  // ========== CORE FUNCTIONS ==========
  initPhysicsSimulation () {
    this.physicsUpdateId = setInterval(() => {
      this.server_updatePhysics();
    }, 15);
  }

  start () {
    this.isGameStarted = true;

    this.initPhysicsSimulation();
    this.server_update();
  }

  stop () {
    this.isGameStarted = false;

    clearInterval(this.physicsUpdateId);
    window.cancelAnimationFrame(this.updateId);
  }
  // ====================================

  server_addPlayer (data) {
    if (this.server_isGameAvailableForJoin()) {
      return false;
    }

    const player = new Player(data.playerId, data.playerName, data.playerColor);
    this.players.push(player);

    this.server_setPlayerInitialPosition(player);
    return true;
  }

  server_removePlayer (playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
  }

  server_isGameAvailableForJoin () {
    if (this.isGameStarted) {
      return false;
    }
    return this.players.length === this.requiredPlayersCount;
  }

  server_setPlayerInitialPosition (player) {
    const positionIndex = this.players.length;

    switch (positionIndex) {
      case 0:
        player.setPosition({ x: 60, y: 60 });   
        break;
      case 1:
        player.setPosition({ x: 800, y: 60 });   
        break;
      case 2:
        player.setPosition({ x: 60, y: 600 });   
        break;
      case 3:
        player.setPosition({ x: 800, y: 600 });   
        break;
    }
  }

  server_setPlayerReady (data) {
    const player = this.players.find(p => p.id === data.playerId);
    if (!player) { return false; }

    player.isReady = true;
    return true;
  }

  server_onPlayerDeath (player) {
    player.isAlive = false;

    this.server_endGameIfThereIsWinner();
  }

  server_startGameIfAllPlayersAreReady () {
    if (this.isGameStarted) { return; }

    const readyPlayersCount = this.players.filter(p => p.isReady).length;

    if (readyPlayersCount === this.requiredPlayersCount) {
      this.server_startGameCountdown();
    }
  }

  server_startGameCountdown () {
    let secondsToStart = 5;

    const emitCountdown = () => connectionService.emit(this.gameRoom, 'game-start-countdown', secondsToStart);
    emitCountdown();

    const countdownIntervalId = setInterval(() => {
      secondsToStart--;
      emitCountdown();

      if (secondsToStart <= 0) {
        clearInterval(countdownIntervalId);
        this.start();
      }
    }, 1000);    
  }

  server_endGameIfThereIsWinner() {
    if (!this.isGameStarted) { return; }

    const alivePlayersCount = this.players.filter(p => p.isAlive).length;

    // TODO: Comment this out for debugging purpose
    if (alivePlayersCount === 1) {
      const winner = this.players.find(p => p.isAlive);
      connectionService.emit(this.gameRoom, 'game-end', winner.id);

      this.stop();
    }
  }

  server_update () {
    const playerData = this.players.map(player => {
      return {
        id: player.id,
        position: Object.assign({}, player.body.position),
        rotation: player.body.rotation,
        lastInputSeq: +player.lastInputSeq,
        lastAngleSeq: +player.lastAngleSeq,
        thrustEffect: player.isDriving ? 1 : 0
      };
    });

    const dataToSend = this.sharedFunctions.encodeWorldSnapshotData({ players: playerData });
    connectionService.emit(this.gameRoom, 'server-update', dataToSend);

    this.updateId = window.requestAnimationFrame(this.server_update.bind(this));
  }

  server_updatePhysics () {
    this.players.forEach(player => {
      this.sharedFunctions.processPlayerInput(player);
      this.sharedFunctions.processPlayerAngle(player);
      this.sharedFunctions.limitPlayerPositionToMapBounds(player);

      player.update();
  
      player.inputs = [];
      player.angles = [];
    });

    let projectileIndex = this.projectiles.length;

    while (projectileIndex--) {
      const projectile = this.projectiles[projectileIndex];
      projectile.move();

      const pojectilePosition = { x: projectile.body.position.x, y: projectile.body.position.y };
      const isOutOfBounds = this.sharedFunctions.isPositionOutOfBounds(pojectilePosition);

      if (isOutOfBounds) {
        connectionService.emit(this.gameRoom, 'projectile-destroyed', projectile.id);

        this.projectiles.splice(projectileIndex, 1);
      }
    }

    this.server_handleCollisions();
  }

  server_handleInput (player, inputValue, inputSeq) {
    player.inputs.push({ value: inputValue, seq: inputSeq });
  }

  server_handleMousePosition (player, position, inputSeq) {
    const x = parseInt(position[0]);
    const y = parseInt(position[1]);

    const inputAngle = this.sharedFunctions.angleBetweenPoints(player.body.position, { x, y });
    player.angles.push({ value: inputAngle, seq: inputSeq });
  }

  server_handleFiring (player, mousePosition, projectileId) {
    const x = parseInt(mousePosition[0]);
    const y = parseInt(mousePosition[1]);

    const options = {
      id: projectileId,
      playerId: player.id,
      startingPosition: Object.assign({}, player.body.position),
      angle: this.sharedFunctions.angleBetweenPoints(player.body.position, { x, y }),
      velocity: 3,
      damage: 5
    };

    const projectile = new Projectile(options);
    this.projectiles.push(projectile);

    connectionService.emit(this.gameRoom, 'projectile-created', options);
  }

  server_handleCollisions () {
    this.players.forEach(player => {
      let projectileIndex = this.projectiles.length;

      while (projectileIndex--) {
        const projectile = this.projectiles[projectileIndex];
        if (projectile.playerId === player.id) { continue; }

        const isCollision = this.server_isPlayerProjectileCollision(player.body.boundingBox, projectile.body.boundingBox);
        
        if (isCollision) {
          player.health -= projectile.damage;
          if (player.health <= 0) {
            this.server_onPlayerDeath(player);
          }

          const shotPlayerData = {
            id: player.id,
            health: player.health
          };

          connectionService.emit(this.gameRoom, 'projectile-destroyed', projectile.id);
          connectionService.emit(this.gameRoom, 'player-shot', shotPlayerData);

          this.projectiles.splice(projectileIndex, 1);
        }
      }

      this.pathways.forEach(pathway => {
        const { wormholeA, wormholeB } = pathway.wormholes;

        const isPlayerWormholeACollision = this.server_isPlayerWormholeCollision(player.body.boundingBox, wormholeA.boundingBox);
        const isPlayerWormholeBCollision = this.server_isPlayerWormholeCollision(player.body.boundingBox, wormholeB.boundingBox);

        const teleportOffset = {
          x: player.xVelocity + (20 * Math.sign(player.xVelocity)),
          y: player.yVelocity + (20 * Math.sign(player.yVelocity))
        };
        
        if (isPlayerWormholeACollision) {
          player.moveTo({
            x: wormholeB.position.x + teleportOffset.x,
            y: wormholeB.position.y + teleportOffset.y
          });
        }
        else if (isPlayerWormholeBCollision) {
          player.moveTo({
            x: wormholeA.position.x + teleportOffset.x,
            y: wormholeA.position.y + teleportOffset.y
          });
        }
      });
    });
  }

  server_isPlayerProjectileCollision (player, projectile) {
    return SAT.testCirclePolygon(player, projectile);
  }

  server_isPlayerWormholeCollision (player, wormhole) {
    return SAT.testCircleCircle(player, wormhole);
  }
}

module.exports = global.GameCore = GameCore;
