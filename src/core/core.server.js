// Each frame is run every 45ms (~ 22fps)

const SAT = require('sat');

require('./core.shared.js');
require('./../entities/player.server.js');
require('./../entities/projectile.server.js');

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

  constructor (gameInstance) {
    this.instance = gameInstance;
    this.sharedFunctions = new SharedFunctions();

    this.terrain = {
      width: 1000,
      height: 800
    };

    this.initPhysicsSimulation();

    this.players = this.instance.players.map(p => { return new Player(p); });
    this.projectiles = [];
  }

  // ========== CORE FUNCTIONS ==========
  initPhysicsSimulation () {
    setInterval(() => {
      this.server_updatePhysics();
    }, 15);
  }

  start () {
    this.server_update();
  }

  stopUpdate () {
    window.cancelAnimationFrame(this.updateId);
  }
  // ====================================

  server_addPlayer (client) {
    let player = new Player(client);
    this.players.push(player);
    return player;
  }

  server_update () {
    const playerData = this.players.map(player => {
      return {
        id: player.instance.playerId,
        position: Object.assign({}, player.body.position),
        rotation: player.body.rotation,
        lastInputSeq: +player.lastInputSeq,
        lastAngleSeq: +player.lastAngleSeq
      };
    });

    const dataToSend = this.sharedFunctions.encodeWorldSnapshotData({ players: playerData });
    this.players.forEach(player => {
      player.instance.emit('server-update', dataToSend);
    });

    this.updateId = window.requestAnimationFrame(this.server_update.bind(this));
  }

  server_updatePhysics () {
    this.players.forEach(player => {
      this.sharedFunctions.processPlayerInput(player);
      this.sharedFunctions.processPlayerAngle(player);

      // this.sharedFunctions.checkPlayerMapCollision(player, this.terrain);
  
      player.inputs = [];
      player.angles = [];
    });

    let projectileIndex = this.projectiles.length;

    while (projectileIndex--) {
      const projectile = this.projectiles[projectileIndex];
      projectile.move();

      const pojectilePosition = { x: projectile.body.position.x, y: projectile.body.position.y };
      const isOutOfBounds = this.sharedFunctions.isPositionOutOfBounds(pojectilePosition, this.terrain);

      if (isOutOfBounds) {
        // TODO: better way of emitting the message to everyone (instead of this.players[0])
        this.players[0] && this.players[0].instance.emit('projectile-destroyed', projectile.id);
        this.players[0] && this.players[0].instance.broadcast.emit('projectile-destroyed', projectile.id);

        this.projectiles.splice(projectileIndex, 1);
      }
    }

    this.server_handleCollisions();
  }

  server_handleInput (player, inputKeys, inputSeq) {
    player.inputs.push({ keys: inputKeys, seq: inputSeq });
  }

  server_handleMousePosition (player, position, inputSeq) {
    const x = parseInt(position[0]);
    const y = parseInt(position[1]);

    const inputAngle = this.sharedFunctions.angleBetweenPoints(player.body.position, { x, y });
    player.angles.push({ angle: inputAngle, seq: inputSeq });
  }

  server_handleFiring (player, mousePosition, projectileId) {
    const x = parseInt(mousePosition[0]);
    const y = parseInt(mousePosition[1]);

    const options = {
      id: projectileId,
      playerId: player.instance.playerId,
      startingPosition: Object.assign({}, player.body.position),
      angle: this.sharedFunctions.angleBetweenPoints(player.body.position, { x, y }),
      velocity: 3,
      damage: 5
    };

    const projectile = new Projectile(options);
    this.projectiles.push(projectile);

    player.instance.emit('projectile-created', options);
    player.instance.broadcast.emit('projectile-created', options);
  }

  server_handleCollisions () {
    this.players.forEach(player => {
      let projectileIndex = this.projectiles.length;

      while (projectileIndex--) {
        const projectile = this.projectiles[projectileIndex];
        if (projectile.playerId === player.instance.playerId) { continue; }

        const isCollision = this.server_isPlayerProjectileCollision(player.body.boundingBox, projectile.body.boundingBox);

        if (isCollision) {
          player.health -= projectile.damage;
          if (player.health <= 0) {
            this.server_onPlayerDeath(player);
          }

          player.instance.emit('projectile-destroyed', projectile.id);
          player.instance.broadcast.emit('projectile-destroyed', projectile.id);

          const shotPlayerData = {
            id: player.instance.playerId,
            health: player.health
          };
          player.instance.emit('player-shot', shotPlayerData);
          player.instance.broadcast.emit('player-shot', shotPlayerData);

          this.projectiles.splice(projectileIndex, 1);
        }
      }
    });
  }

  server_isPlayerProjectileCollision (player, projectile) {
    return SAT.testCirclePolygon(player, projectile);
  }

  server_onPlayerDeath (player) {
    this.players = this.players.filter(p => p.instance.id !== player.instance.id);
  }
}

module.exports = global.GameCore = GameCore;
