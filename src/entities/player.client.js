const playerHeight = 40;
const playerWidth = 40;
const healthbarWidth = 64;
const healthbarHeight = 5;

class Player extends SimpleEventEmitter {

  constructor (gameInstance, isEnemy) {
    super();

    this.game = gameInstance;

    this.inputs = [];
    this.angles = [];
    this.lastInputSeq = null;
    this.lastAngleSeq = null;

    this.health = 100;
    this.velocity = 2;

    const textureName = isEnemy ? "enemy_ship" : "player_ship";
    let texture = PIXI.loader.resources[`assets/${ textureName }.png`].texture;

    this.body = new PIXI.Sprite(texture);
    this.body.width = playerWidth;
    this.body.height = playerHeight;
    this.body.anchor.x = 0.5;
    this.body.anchor.y = 0.5;

    this.healthbar = new PIXI.Graphics();
    this.drawHealthbar();

    this.game.app.stage.addChild(this.body);
    this.game.app.stage.addChild(this.healthbar);
  }

  setInitialPosition (position) {
    this.moveTo(position);
  }

  setHealth (value) {
    if (value <= 0) {
      this.onPlayerDeath();
      return;
    }

    this.health = value;
    this.drawHealthbar();
  }

  drawHealthbar () {
    this.healthbar.clear();
    this.healthbar.beginFill(0x26b532);
    this.healthbar.drawRect(
      0, 0,
      healthbarWidth * (this.health / 100),
      healthbarHeight
    );
    this.healthbar.beginFill(0x9c1c1c);
    this.healthbar.drawRect(
      healthbarWidth * (this.health / 100),
      0,
      healthbarWidth * (1 - this.health / 100),
      healthbarHeight
    );
    this.healthbar.endFill();
  }

  onPlayerDeath () {
    // TODO: Create explosion sprite at player position

    this.health = 0;

    this.dispatch("player-death");
    this.remove();
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

    this.healthbar.x += x * this.velocity;
    this.healthbar.y += y * this.velocity;
  }

  moveTo (position) {
    const { x, y } = position;

    this.body.x = x;
    this.body.y = y;

    this.healthbar.x = this.body.x - (healthbarWidth * 0.5);
    this.healthbar.y = this.body.y - playerHeight;
  }

  rotateTo (radians) {
    this.body.rotation = radians;
  }

  remove () {
    this.game.app.stage.removeChild(this.body);
    this.game.app.stage.removeChild(this.healthbar);
  }
}
