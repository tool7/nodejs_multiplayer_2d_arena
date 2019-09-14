(function () {
  
  class SharedFunctions {

    constructor () {
      this.mapDimensions = {
        width: 1920,
        height: 1080
      };
    }

    // On client side this is only called for "self" player
    processPlayerInput (player) {
      let inputsLength = player.inputs.length;
      if (!inputsLength) { return; }
  
      for (let i = 0; i < inputsLength; i++) {
        if (player.inputs[i].seq <= player.lastInputSeq) { continue; }
  
        const command = player.inputs[i].value;

        if (command === "d+") {
          player.drive();
        } else if (command === "d-") {
          player.stopDriving();
        }
      }
      player.lastInputSeq = player.inputs[inputsLength - 1].seq;
    }
  
    processPlayerAngle (player) {
      let anglesLength = player.angles.length;
      if (!anglesLength) { return; }
  
      for (let i = 0; i < anglesLength; i++) {
        if (player.angles[i].seq <= player.lastAngleSeq) { continue; }
  
        let angle = player.angles[i].value;
        player.setRotation(angle);
      }
    
      player.lastAngleSeq = player.angles[anglesLength - 1].seq;
    }
  
    limitPlayerPositionToMapBounds (player) {
      const playerWidth = player.body.width;
      const playerHeight = player.body.height;
      const positionLimits = {
        x_min: playerWidth,
        x_max: this.mapDimensions.width - playerWidth,
        y_min: playerHeight,
        y_max: this.mapDimensions.height - playerHeight
      };

      let playerPosX = player.body.position.x;
      let playerPosY = player.body.position.y;

      if (playerPosX <= positionLimits.x_min) {
        playerPosX = positionLimits.x_min + 1;
        player.xVelocity = 0;
      }
      if (playerPosX >= positionLimits.x_max) {
        playerPosX = positionLimits.x_max - 1;
        player.xVelocity = 0;
      }
      if (playerPosY <= positionLimits.y_min) {
        playerPosY = positionLimits.y_min + 1;
        player.yVelocity = 0;
      }
      if (playerPosY >= positionLimits.y_max) {
        playerPosY = positionLimits.y_max - 1;
        player.yVelocity = 0;
      }

      player.setPosition({ x: playerPosX, y: playerPosY });
    }

    isPositionOutOfBounds (position) {
      const { x, y } = position;
      const positionLimits = {
        x_min: 0,
        x_max: this.mapDimensions.width,
        y_min: 0,
        y_max: this.mapDimensions.height
      };

      return (x <= positionLimits.x_min) || (x >= positionLimits.x_max) ||
        (y <= positionLimits.y_min) || (y >= positionLimits.y_max);
    }

    angleBetweenPoints (pointA, pointB) {
      return Math.atan2(pointB.y - pointA.y, pointB.x - pointA.x);
    }

    encodeWorldSnapshotData (data) {
      let encodedData = {
        players: {},
        t: new Date().getTime()
      };

      data.players.forEach(p => {
        encodedData.players[p.id] = `${ p.position.x },${ p.position.y };${ p.velocity.x },${ p.velocity.y };${ p.rotation };${ p.lastInputSeq };${ p.lastAngleSeq };${ p.thrustEffect }`
      });

      return encodedData;
    }

    decodeWorldSnapshotData (encodedData) {
      let players = {};

      Object.keys(encodedData.players).forEach(playerId => {
        const encodedPlayerData = encodedData.players[playerId].split(";");
        const encodedPlayerPosition = encodedPlayerData[0].split(",");
        const encodedPlayerVelocity = encodedPlayerData[1].split(",");

        players[playerId] = {
          position: { x: +encodedPlayerPosition[0], y: +encodedPlayerPosition[1] },
          velocity: { x: +encodedPlayerVelocity[0], y: +encodedPlayerVelocity[1] },
          rotation: +encodedPlayerData[2],
          lastInputSeq: +encodedPlayerData[3],
          lastAngleSeq: +encodedPlayerData[4],
          thrustEffect: !!+encodedPlayerData[5]
        };
      });

      return {
        players,
        time: encodedData.t
      };
    }

    getRandomNumberInRange (min, max) {
      return Math.random() * (max - min) + min;
    }
  }

  if ('undefined' !== typeof global) {
    module.exports = global.SharedFunctions = SharedFunctions;
  }
  else {
    window.SharedFunctions = SharedFunctions;
  }
}());
