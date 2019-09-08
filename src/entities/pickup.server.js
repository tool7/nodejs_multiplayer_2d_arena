const SAT = require('sat');

const pickupRadius = 15;

class Pickup {

  constructor (id, type, position) {
    this.id = id;
    this.type = type;
    
    this.boundingBox = new SAT.Circle(new SAT.Vector(position.x, position.y), pickupRadius);
  }
}

module.exports = global.Pickup = Pickup;
