(function () {
  
  class SharedFunctions {

    processPlayerInput (player) {
      let inputsLength = player.inputs.length;
      if (!inputsLength) { return; }
  
      for (let i = 0; i < inputsLength; i++) {
        if (player.inputs[i].seq <= player.lastInputSeq) { continue; }
  
        let directions = player.inputs[i].keys;
        player.move(directions);
      }
  
      player.lastInputSeq = player.inputs[inputsLength - 1].seq;
    }
  
    processPlayerAngle (player) {
      let anglesLength = player.angles.length;
      if (!anglesLength) { return; }
  
      for (let i = 0; i < anglesLength; i++) {
        if (player.angles[i].seq <= player.lastAngleSeq) { continue; }
  
        let angle = player.angles[i].angle;
        player.rotateTo(angle);
      }
    
      player.lastAngleSeq = player.angles[anglesLength - 1].seq;
    }
  
    checkPlayerMapCollision (player, mapDimensions) {
      const playerPosX = player.body.position.x;
      const playerPosY = player.body.position.y;
      const playerWidth = player.body.width;
      const playerHeight = player.body.height;

      const positionLimits = {
        x_min: playerWidth,
        x_max: mapDimensions.width - playerWidth,
        y_min: playerHeight,
        y_max: mapDimensions.height - playerHeight
      };

      if (playerPosX <= positionLimits.x_min) {
        player.moveTo({ x: positionLimits.x_min, y: playerPosY });
      }
  
      if (playerPosX >= positionLimits.x_max) {
        player.moveTo({ x: positionLimits.x_max, y: playerPosY });
      }
      
      if (playerPosY <= positionLimits.y_min) {
        player.moveTo({ x: playerPosX, y: positionLimits.y_min });
      }
  
      if (playerPosY >= positionLimits.y_max) {
        player.moveTo({ x: playerPosX, y: positionLimits.y_max });
      }
  
      player.body.position.x = parseInt(playerPosX);
      player.body.position.y = parseInt(playerPosY);
    }

    isPositionOutOfBounds (position, mapDimensions) {
      const { x, y } = position;
      const positionLimits = {
        x_min: 0,
        x_max: mapDimensions.width,
        y_min: 0,
        y_max: mapDimensions.height
      };

      return (x <= positionLimits.x_min) || (x >= positionLimits.x_max) ||
        (y <= positionLimits.y_min) || (y >= positionLimits.y_max);
    }

    angleBetweenPoints (pointA, pointB) {
      return Math.atan2(pointB.y - pointA.y, pointB.x - pointA.x);
    }
  }

  if ('undefined' !== typeof global) {
    module.exports = global.SharedFunctions = SharedFunctions;
  }
  else {
    window.SharedFunctions = SharedFunctions;
  }
}());
