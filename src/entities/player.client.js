const playerHeight = 64;
const playerWidth = 46;
const healthbarWidth = 80;
const healthbarHeight = 5;

class Player extends SimpleEventEmitter {

  constructor (app, name, color) {
    super();

    this.app = app;
    this.name = name;

    this.inputs = [];
    this.angles = [];
    this.lastInputSeq = null;
    this.lastAngleSeq = null;
    this.health = 100;
    this.xVelocity = 0;
    this.yVelocity = 0;
    this.maxVelocity = 4;

    const texture = PIXI.loader.resources["assets/player_ship.png"].texture;
    this.body = new PIXI.Sprite(texture);
    this.body.tint = color;
    this.body.width = playerWidth;
    this.body.height = playerHeight;
    this.body.anchor.x = 0.5;
    this.body.anchor.y = 0.5;
    
    this.playerNameText = new PIXI.Text(this.name, new PIXI.TextStyle({
      fontFamily: "Jura",
      fontSize: 14,
      fill: "#ffffff"
    }));

    this.healthbar = new PIXI.Graphics();
    this.drawHealthbar();

    this.app.stage.addChild(this.body);
    this.app.stage.addChild(this.playerNameText);
    this.app.stage.addChild(this.healthbar);
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
  }

  update () {
    this.body.x += this.xVelocity;
    this.body.y += this.yVelocity;

    this.playerNameText.x += this.xVelocity;
    this.playerNameText.y += this.yVelocity;

    this.healthbar.x += this.xVelocity;
    this.healthbar.y += this.yVelocity;
  }

  moveTo (position) {
    const { x, y } = position;

    this.body.x = x;
    this.body.y = y;

    this.playerNameText.x = x - (healthbarWidth * 0.5);
    this.playerNameText.y = y - playerHeight - 20;

    this.healthbar.x = x - (healthbarWidth * 0.5);
    this.healthbar.y = y - playerHeight;
  }

  rotateTo (radians) {
    this.body.rotation = radians;
  }

  remove () {
    this.app.stage.removeChild(this.body);
    this.app.stage.removeChild(this.playerNameText);
    this.app.stage.removeChild(this.healthbar);
  }
}
