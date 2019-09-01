// Each frame is run every 45ms (~ 22fps)

const SAT = require('sat');
const uuidv4 = require('uuid/v4');

const connection = require('../connection');

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
    // Note: If *this.io.to(GAME_ROOM)* is passed to constructor or put it in a variable,
    // using it to emit events will not work properly.
    // So instead it must be used as *this.io.to(this.gameRoom).emit('EVENT');*
    this.io = connection.io;
    this.gameRoom = data.gameRoom;

    this.sharedFunctions = new SharedFunctions();
    this.isStarted = false;
    this.players = [];
    this.projectiles = [];
    this.pathways = [
      new Pathway(uuidv4(), { x: 200, y: 200 }, { x: 800, y: 500 }, 0x00ff00),
      new Pathway(uuidv4(), { x: 100, y: 700 }, { x: 900, y: 100 }, 0xffffff)
    ];
  }

  // ========== CORE FUNCTIONS ==========
  initPhysicsSimulation () {
    setInterval(() => {
      this.server_updatePhysics();
    }, 15);
  }

  start () {
    this.isStarted = true;

    this.initPhysicsSimulation();
    this.server_update();
  }

  stopUpdate () {
    window.cancelAnimationFrame(this.updateId);
  }
  // ====================================

  server_addPlayer (data) {
    const player = new Player(data.playerId, data.playerName, data.playerColor);
    this.players.push(player);
    
    return player;
  }

  server_update () {
    const playerData = this.players.map(player => {
      return {
        id: player.id,
        position: Object.assign({}, player.body.position),
        rotation: player.body.rotation,
        lastInputSeq: +player.lastInputSeq,
        lastAngleSeq: +player.lastAngleSeq
      };
    });

    const dataToSend = this.sharedFunctions.encodeWorldSnapshotData({ players: playerData });
    this.io.to(this.gameRoom).emit('server-update', dataToSend);

    this.updateId = window.requestAnimationFrame(this.server_update.bind(this));
  }

  server_updatePhysics () {
    this.players.forEach(player => {
      this.sharedFunctions.processPlayerInput(player);
      this.sharedFunctions.processPlayerAngle(player);

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
        this.io.to(this.gameRoom).emit('projectile-destroyed', projectile.id);

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

    this.io.to(this.gameRoom).emit('projectile-created', options);
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

          this.io.to(this.gameRoom).emit('projectile-destroyed', projectile.id);
          this.io.to(this.gameRoom).emit('player-shot', shotPlayerData);

          this.projectiles.splice(projectileIndex, 1);
        }
      }

      this.pathways.forEach(pathway => {
        const { wormholeA, wormholeB } = pathway.wormholes;

        const isPlayerWormholeACollision = this.server_isPlayerWormholeCollision(player.body.boundingBox, wormholeA.boundingBox);
        const isPlayerWormholeBCollision = this.server_isPlayerWormholeCollision(player.body.boundingBox, wormholeB.boundingBox);

        // TODO: Debugging purposes. Replace this with proper values
        // once different player movement mechanism is implemented
        const playerOffset = { x: 50, y: 50 };

        if (isPlayerWormholeACollision) {
          player.moveTo({
            x: wormholeB.position.x + playerOffset.x,
            y: wormholeB.position.y + playerOffset.y
          });
        }
        else if (isPlayerWormholeBCollision) {
          player.moveTo({
            x: wormholeA.position.x + playerOffset.x,
            y: wormholeA.position.y + playerOffset.y
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

  server_onPlayerDeath (player) {
    this.players = this.players.filter(p => p.id !== player.id);
  }
}

module.exports = global.GameCore = GameCore;
