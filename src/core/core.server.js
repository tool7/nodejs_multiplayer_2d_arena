// Each frame is run every 45ms (~ 22fps)

const SAT = require('sat');
const uuidv4 = require('uuid/v4');

const connectionService = require('../connection_service');

require('./core.shared.js');
require('./../entities/player.server.js');
require('./../entities/projectile.server.js');
require('./../entities/pathway.server.js');
require('./../entities/pickup.server.js');

const PICKUP_TYPE = {
  Health: 'health',
  Shield: 'shield'
};

const framesTillPickupSpawnMinMax = {
  min: 500,
  max: 1200
};

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
    this.pickups = [];
    this.pathways = [
      new Pathway(uuidv4(), { x: 200, y: 200 }, { x: 800, y: 500 }, 0x00ff00),
      new Pathway(uuidv4(), { x: 100, y: 700 }, { x: 900, y: 100 }, 0xffffff)
    ];
    this.framesTillPickupSpawn = 200;
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

    if (alivePlayersCount === 1) {
      const winner = this.players.find(p => p.isAlive);
      connectionService.emit(this.gameRoom, 'game-end', winner.id);

      this.stop();
    }
  }

  server_spawnPickupIfAble () {
    if (this.pickups.length >= 5) { return; }
    if (this.framesTillPickupSpawn > 0) {
      this.framesTillPickupSpawn--;
      return;
    }

    const oneOrZero = +this.sharedFunctions.getRandomNumberInRange(0, 1).toFixed();
    const pickupType = oneOrZero ? PICKUP_TYPE.Health : PICKUP_TYPE.Shield;
    const pickupPosition = {
      // Value 20 is used as offset from borders of the map
      x: +this.sharedFunctions.getRandomNumberInRange(20, this.sharedFunctions.mapDimensions.width - 20).toFixed(),
      y: +this.sharedFunctions.getRandomNumberInRange(20, this.sharedFunctions.mapDimensions.height - 20).toFixed(),
    };

    const pickup = new Pickup(uuidv4(), pickupType, pickupPosition);
    this.pickups.push(pickup);

    connectionService.emit(this.gameRoom, 'pickup-spawned', {
      id: pickup.id,
      type: pickupType,
      position: pickupPosition
    });

    this.framesTillPickupSpawn = +this.sharedFunctions.getRandomNumberInRange(
      framesTillPickupSpawnMinMax.min,
      framesTillPickupSpawnMinMax.max
    ).toFixed();
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

    this.server_spawnPickupIfAble();

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

    const projectileConfig = {
      id: projectileId,
      playerId: player.id,
      startingPosition: Object.assign({}, player.body.position),
      angle: this.sharedFunctions.angleBetweenPoints(player.body.position, { x, y }),
      velocity: 10,
      damage: 5
    };

    const projectile = new Projectile(projectileConfig);
    this.projectiles.push(projectile);

    const { playerId, damage, ...eventData } = projectileConfig;
    connectionService.emit(this.gameRoom, 'projectile-created', eventData);
  }

  server_tryTakePickup (pickup, player) {
    const eventData = { id: pickup.id, playerId: player.id };

    switch (pickup.type) {
      case PICKUP_TYPE.Health:
        if (player.health < 100) {
          player.health = Math.min(player.health + 15, 100);

          connectionService.emit(this.gameRoom, 'pickup-taken', eventData);
          return true;
        }
        break;
      case PICKUP_TYPE.Shield:
        if (player.shieldPoints === 0) {
          player.shieldPoints = 5;

          connectionService.emit(this.gameRoom, 'pickup-taken', eventData);
          return true;
        }
        break;
    }

    return false;
  }

  server_handlePlayerShot (player, projectile) {
    let { damage } = projectile;
    if (player.shieldPoints > 0) {
      damage *= 0.2;
    }

    player.health -= damage;
    player.shieldPoints = Math.max(0, player.shieldPoints - 1);

    if (player.health <= 0) {
      this.server_onPlayerDeath(player);
    }

    const shotPlayerData = {
      id: player.id,
      health: player.health
    };

    connectionService.emit(this.gameRoom, 'player-shot', shotPlayerData);
  }

  server_handleCollisions () {
    this.players.forEach(player => {
      let projectileIndex = this.projectiles.length;

      while (projectileIndex--) {
        const projectile = this.projectiles[projectileIndex];
        if (projectile.playerId === player.id) { continue; }

        const isCollision = this.server_isPlayerProjectileCollision(player.body.boundingBox, projectile.body.boundingBox);
        
        if (isCollision) {
          this.server_handlePlayerShot(player, projectile);

          connectionService.emit(this.gameRoom, 'projectile-destroyed', projectile.id);
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

      this.pickups = this.pickups.filter(pickup => {
        const isCollision = this.server_isPlayerPickupCollision(player.body.boundingBox, pickup.boundingBox);
        let isPickupTaken = false;

        if (isCollision) {
          isPickupTaken = this.server_tryTakePickup(pickup, player);
        }

        return !isCollision || !isPickupTaken;
      });
    });
  }

  server_isPlayerProjectileCollision (player, projectile) {
    return SAT.testCirclePolygon(player, projectile);
  }

  server_isPlayerWormholeCollision (player, wormhole) {
    return SAT.testCircleCircle(player, wormhole);
  }

  server_isPlayerPickupCollision (player, pickup) {
    return SAT.testCircleCircle(player, pickup);
  }
}

module.exports = global.GameCore = GameCore;
