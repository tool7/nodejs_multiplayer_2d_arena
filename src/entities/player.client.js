const playerHeight = 40;
const playerWidth = 40;
const healthbarWidth = 80;
const healthbarHeight = 5;

class Player extends SimpleEventEmitter {

  constructor (app, name, isEnemy) {
    super();

    this.app = app;
    this.name = name;

    this.inputs = [];
    this.angles = [];
    this.lastInputSeq = null;
    this.lastAngleSeq = null;

    this.health = 100;
    this.velocity = 2;

    const textureName = isEnemy ? "enemy_ship" : "player_ship";
    const texture = PIXI.loader.resources[`assets/${ textureName }.png`].texture;

    this.body = new PIXI.Sprite(texture);
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

    const xOffset = x * this.velocity;
    const yOffset = y * this.velocity;

    this.body.x += xOffset;
    this.body.y += yOffset;

    this.playerNameText.x += xOffset;
    this.playerNameText.y += yOffset;

    this.healthbar.x += xOffset;
    this.healthbar.y += yOffset;
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
