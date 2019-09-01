const SAT = require('sat');

const wormholeRadius = 5;

class Pathway {

  constructor (id, wormholeAPos, wormholeBPos, color) {
    this.id = id;
    this.color = color;

    this.wormholes = {
      wormholeA: {
        position: wormholeAPos,
        boundingBox: new SAT.Circle(new SAT.Vector(wormholeAPos.x, wormholeAPos.y), wormholeRadius)
      },
      wormholeB: {
        position: wormholeBPos,
        boundingBox: new SAT.Circle(new SAT.Vector(wormholeBPos.x, wormholeBPos.y), wormholeRadius)
      }
    };
  }
}

module.exports = global.Pathway = Pathway;
