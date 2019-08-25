const SAT = require('sat');

const playerHeight = 40;
const playerWidth = 40;

class Player {

  constructor (id, name) {
    this.id = id;
    this.name = name;

    this.inputs = [];
    this.angles = [];
    this.lastInputSeq = null;
    this.lastAngleSeq = null;

    this.health = 100;
    this.velocity = 2;

    this.body = {
      position: { x: 0, y: 0 },
      rotation: 0,
      width: playerWidth,
      height: playerHeight,
      boundingBox: new SAT.Circle(new SAT.Vector(), playerWidth / 2)
    };
  }

  setInitialPosition (position) {
    this.moveTo(position);
  }

  move (directions) {
    let x = 0;
    let y = 0;

    directions.forEach(direction => {
      switch (direction) {
        case 'l':
          x = -1;
          break;
        case 'r':
          x = 1;
          break;
        case 'u':
          y = -1;
          break;
        case 'd':
          y = 1;
          break;
      }
    });

    this.body.position.x += x * this.velocity;
    this.body.position.y += y * this.velocity;

    this.body.boundingBox.pos.x += x * this.velocity;
    this.body.boundingBox.pos.y += y * this.velocity;
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
