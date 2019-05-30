class Projectile {

  constructor (gameInstance, options) {
    this.game = gameInstance;
    
    let { x, y } = options.startingPosition;

    this.id = options.id;
    this.playerId = options.playerId;
    this.damage = options.damage;

    let texture = PIXI.loader.resources["assets/basic_projectile.png"].texture;

    this.body = new PIXI.Sprite(texture);

    // TODO: set dynamically depending on projectile type
    this.body.width = 15;
    this.body.height = 5;

    this.body.x = x;
    this.body.y = y;
    this.body.rotation = options.angle;

    this.velocity = options.velocity;
    this.velocity_x = this.velocity * Math.cos(options.angle);
    this.velocity_y = this.velocity * Math.sin(options.angle);

    this.game.app.stage.addChild(this.body);
  }

  move () {
    this.body.x += this.velocity_x;
    this.body.y += this.velocity_y;
  }

  remove () {
    this.game.app.stage.removeChild(this.body);
  }
}
