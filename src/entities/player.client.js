const playerHeight = 64;
const playerWidth = 46;
const healthbarWidth = 80;
const healthbarHeight = 5;

class Player {

  constructor (app, name, color) {
    this.app = app;
    this.name = name;
    this.color = color;

    this.isAlive = true;
    this.isDriving = false;

    this.inputs = [];
    this.angles = [];
    this.lastInputSeq = null;
    this.lastAngleSeq = null;
    this.health = 100;
    this.xVelocity = 0;
    this.yVelocity = 0;
    this.maxVelocity = 4;

    const shipTexture = PIXI.loader.resources["assets/player_ship.png"].texture;
    this.body = new PIXI.Sprite(shipTexture);
    this.body.tint = color;
    this.body.width = playerWidth;
    this.body.height = playerHeight;
    this.body.anchor.x = 0.5;
    this.body.anchor.y = 0.5;

    const thrustTexture = PIXI.loader.resources["assets/thrust_fire.png"].texture;
    this.leftThrust = new PIXI.Sprite(thrustTexture);
    this.rightThrust = new PIXI.Sprite(thrustTexture);
    this.leftThrust.anchor.x = 0.5;
    this.leftThrust.anchor.y = 0.5;
    this.leftThrust.width *= 1.2;
    this.leftThrust.height *= 1.6;
    this.leftThrust.x -= playerWidth;
    this.leftThrust.y -= 22;
    this.leftThrust.visible = false;
    this.rightThrust.anchor.x = 0.5;
    this.rightThrust.anchor.y = 0.5;
    this.rightThrust.width *= 1.2;
    this.rightThrust.height *= 1.6;
    this.rightThrust.x -= playerWidth;
    this.rightThrust.y += 22;
    this.rightThrust.visible = false;

    const explosionTextures = [];
    for (let i = 1; i < 10; i++) {
      const texture = PIXI.loader.resources[`assets/ship_explosion/${i}.png`].texture;
      explosionTextures.push(texture);
    }
    this.explosion = new PIXI.AnimatedSprite(explosionTextures);
    this.explosion.visible = false;
    this.explosion.loop = false;
    this.explosion.anchor.set(0.5);
    this.explosion.animationSpeed = 0.2;
    this.explosion.onComplete = () => {
      this.app.stage.removeChild(this.explosion);
    };
    
    this.playerNameText = new PIXI.Text(this.name, new PIXI.TextStyle({
      fontFamily: "Jura",
      fontSize: 14,
      fill: "#ffffff"
    }));

    this.healthbar = new PIXI.Graphics();
    this.drawHealthbar();

    this.body.addChild(this.leftThrust);
    this.body.addChild(this.rightThrust);
    this.app.stage.addChild(this.explosion);
    this.app.stage.addChild(this.body);
    this.app.stage.addChild(this.playerNameText);
    this.app.stage.addChild(this.healthbar);
  }

  setPosition (position) {
    this.moveTo(position);
  }

  setHealth (value) {
    if (value <= 0) {
      this.onDeath();
      return;
    }

    this.health = value;
  }

  onShot (newHp) {
    this.setHealth(newHp);
    this.drawHealthbar();
    this.playShotBlinkEffect();
  }

  onHealthPickupTaken (newHp) {
    this.setHealth(newHp);
    this.drawHealthbar();
    this.playHealEffect();
  }

  onShieldPickupTaken () {
    
  }

  onDeath () {
    this.playExplosionAnimation();

    this.isAlive = false;
    this.health = 0;
    this.destroy();
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

  playShotBlinkEffect () {
    createjs.Sound.play("ship-hit");

    let blinkEffectCount = 6;
    clearInterval(this.blinkIntervalId);

    this.blinkIntervalId = setInterval(() => {
      if (blinkEffectCount % 2 === 0) {
        this.body.tint = 0xffffff;
      } else {
        this.body.tint = this.color;
      }

      if (blinkEffectCount <= 0) {
        this.body.tint = this.color;
        clearInterval(this.blinkIntervalId);
      }

      blinkEffectCount--;
    }, 30);
  }

  playHealEffect () {

  }

  playExplosionAnimation () {
    createjs.Sound.play("ship-explosion");

    this.explosion.x = this.body.x;
    this.explosion.y = this.body.y;
    this.explosion.visible = true;
    this.explosion.play();
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

    this.isDriving = true;
    this.updateThrustEffect(true);
  }

  stopDriving () {
    if (!this.isDriving) { return; }

    this.isDriving = false;
    this.updateThrustEffect(false);
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

  updateThrustEffect (isEnabled) {
    if (!this.thrustSound) {
      this.thrustSound = createjs.Sound.play("ship-thrust");
      this.thrustSound.volume = 0;
    }
    
    if (isEnabled) {
      this.leftThrust.visible = true;
      this.rightThrust.visible = true;

      this.thrustSound.volume = 0.3;
      this.thrustSound.play();

      clearInterval(this.thrustSoundReduceIntervalId);
      this.thrustSoundReduceIntervalId = null;
    }
    else {
      this.leftThrust.visible = false;
      this.rightThrust.visible = false;
  
      this.thrustSoundReduceIntervalId = setInterval(() => {
        this.thrustSound.volume -= 0.1;
  
        if (this.thrustSound.volume <= 0) {
          this.thrustSound.stop();

          clearInterval(this.thrustSoundReduceIntervalId);
          this.thrustSoundReduceIntervalId = null;
        }
      }, 100);
    } 
  }

  destroy () {
    this.app.stage.removeChild(this.body);
    this.app.stage.removeChild(this.playerNameText);
    this.app.stage.removeChild(this.healthbar);
  }
}
