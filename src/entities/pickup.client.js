const pickupSpriteSize = 30;

class Pickup {

  constructor (app, type, position) {
    this.app = app;
    this.type = type;

    const texture = PIXI.loader.resources[`assets/${type}_pickup.png`].texture;

    this.body = new PIXI.Sprite(texture);
    this.body.width = pickupSpriteSize;
    this.body.height = pickupSpriteSize;
    this.body.position = position;
    this.body.anchor.set(0.5);

    this.app.stage.addChild(this.body);

    this.app.ticker.add(() => {
      this.body.rotation += 0.02;
    });

    // createjs.Sound.play("pickup-spawn");
  }

  destroy () {
    this.app.stage.removeChild(this.body);
  }
}
