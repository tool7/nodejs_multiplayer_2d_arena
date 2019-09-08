const SAT = require('sat');

class Projectile {

  constructor (config) {    
    let { x, y } = config.startingPosition;

    this.id = config.id;
    this.playerId = config.playerId;
    this.damage = config.damage;

    this.angle = config.angle;
    this.velocity = config.velocity;
    this.velocity_x = this.velocity * Math.cos(this.angle);
    this.velocity_y = this.velocity * Math.sin(this.angle);

    this.body = {
      position: { x, y },
      width: 5,
      height: 15,
      boundingBox: null
    };

    let boundingBox = new SAT.Box(new SAT.Vector(x, y), 5, 15).toPolygon();
    boundingBox.setAngle(config.angle);
    this.body.boundingBox = boundingBox;
  }

  move () {
    this.body.position.x += this.velocity_x;
    this.body.position.y += this.velocity_y;

    this.body.boundingBox.pos.x += this.velocity_x;
    this.body.boundingBox.pos.y += this.velocity_y;
  }
}

module.exports = global.Projectile = Projectile;
