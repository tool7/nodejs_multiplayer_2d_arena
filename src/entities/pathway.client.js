const wormholeSpriteSize = 50;

class Pathway {

  constructor (app, wormholeAPos, wormholeBPos, color) {
    this.app = app;

    const texture = PIXI.loader.resources["assets/wormhole.png"].texture;

    this.wormholeA = new PIXI.Sprite(texture);
    this.wormholeA.width = wormholeSpriteSize;
    this.wormholeA.height = wormholeSpriteSize;
    this.wormholeA.position = wormholeAPos;
    this.wormholeA.tint = color;
    this.wormholeA.anchor.set(0.5);

    this.wormholeB = new PIXI.Sprite(texture);
    this.wormholeB.width = wormholeSpriteSize;
    this.wormholeB.height = wormholeSpriteSize;
    this.wormholeB.position = wormholeBPos;
    this.wormholeB.tint = color;
    this.wormholeB.anchor.set(0.5);

    this.app.stage.addChild(this.wormholeA);
    this.app.stage.addChild(this.wormholeB);

    this.app.ticker.add(() => {
      this.wormholeA.rotation += 0.02;
      this.wormholeB.rotation += 0.02;
    });
  }

  destroy () {
    this.app.stage.removeChild(this.wormholeA);
    this.app.stage.removeChild(this.wormholeB);
  }
}
