class Projectile {

  constructor (gameInstance, config) {
    this.game = gameInstance;
    
    const { x, y } = config.startingPosition;

    this.id = config.id;
    this.playerId = config.playerId;
    this.damage = config.damage;

    const texture = PIXI.loader.resources["assets/basic_projectile.png"].texture;
    this.body = new PIXI.Sprite(texture);

    // TODO: set dynamically depending on projectile type
    this.body.width = 15;
    this.body.height = 5;

    this.body.x = x;
    this.body.y = y;
    this.body.rotation = config.angle;

    this.velocity = config.velocity;
    this.velocity_x = this.velocity * Math.cos(config.angle);
    this.velocity_y = this.velocity * Math.sin(config.angle);

    this.game.app.stage.addChild(this.body);

    createjs.Sound.play("basic-shot");
  }

  move () {
    this.body.x += this.velocity_x;
    this.body.y += this.velocity_y;
  }

  destroy () {
    this.game.app.stage.removeChild(this.body);
  }
}
