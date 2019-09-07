const SAT = require('sat');

const playerHeight = 64;
const playerWidth = 46;

class Player {

  constructor (id, name, color) {
    this.id = id;
    this.name = name;
    this.color = color;

    this.isReady = false;
    this.isAlive = true;
    this.isDriving = false;

    this.inputs = [];
    this.angles = [];
    this.lastInputSeq = null;
    this.lastAngleSeq = null;
    this.health = 100;
    this.xVelocity = 0;
    this.yVelocity = 0;
    this.maxVelocity = 3;

    this.body = {
      position: { x: 0, y: 0 },
      rotation: 0,
      width: playerWidth,
      height: playerHeight,
      boundingBox: new SAT.Circle(new SAT.Vector(), playerWidth / 2)
    };
  }

  setPosition (position) {
    this.moveTo(position);
  }

  drive () {
    const currentAngle = this.angles[0];
    if (!currentAngle) { return; }

    const direction = currentAngle.value;

    const newXVelocity = this.xVelocity + (Math.cos(direction) / 10);
    const newYVelocity = this.yVelocity + (Math.sin(direction) / 10);

    if (Math.abs(newXVelocity) < this.maxVelocity) {
      this.xVelocity = newXVelocity;
    }

    if (Math.abs(newYVelocity) < this.maxVelocity) {
      this.yVelocity = newYVelocity;
    }

    this.isDriving = true;
  }

  stopDriving () {
    this.isDriving = false;
  }

  update () {
    this.body.position.x += this.xVelocity;
    this.body.position.y += this.yVelocity;

    this.body.boundingBox.pos.x += this.xVelocity;
    this.body.boundingBox.pos.y += this.yVelocity;
  }

  moveTo (position) {
    this.body.position.x = position.x;
    this.body.position.y = position.y;

    this.body.boundingBox.pos = position;
  }

  rotateTo (radians) {
    this.body.rotation = radians;
  }
}

module.exports = global.Player = Player;
