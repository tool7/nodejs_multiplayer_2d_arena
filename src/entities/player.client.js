const playerHeight = 40;
const playerWidth = 40;

class Player {

  constructor (gameInstance, isEnemy) {
    this.game = gameInstance;

    this.inputs = [];
    this.angles = [];
    this.lastInputSeq = null;
    this.lastAngleSeq = null;

    this.health = 100;
    this.isDead = false;
    this.velocity = 2;

    const textureName = isEnemy ? "enemy_ship" : "player_ship";
    let texture = PIXI.loader.resources[`assets/${ textureName }.png`].texture;

    this.body = new PIXI.Sprite(texture);
    this.body.width = playerWidth;
    this.body.height = playerHeight;
    this.body.anchor.x = 0.5;
    this.body.anchor.y = 0.5;
    
    this.game.app.stage.addChild(this.body);
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

    this.body.x += x * this.velocity;
    this.body.y += y * this.velocity;
  }

  moveTo (position) {
    this.body.x = position.x;
    this.body.y = position.y;
  }

  rotateTo (radians) {
    this.body.rotation = radians;
  }

  remove () {
    this.game.app.stage.removeChild(this.body);
  }
}
