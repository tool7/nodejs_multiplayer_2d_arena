window.onload = function () {

  setupMenuBoxAnimation();
  setupMenuButtonEventHandlers();

};

const setupMenuBoxAnimation = () => {
  const menuBox = document.getElementById("menu-box");
  const screenWidth = document.body.clientWidth;
  const screenHeight = document.body.clientHeight;

  const originPosition = {
    x: screenWidth / 2,
    y: screenHeight / 2
  };

  const updateTransformStyle = (x, y) => {
    const style = `translate(-50%, -50%) rotateX(${-y}deg) rotateY(${x}deg)`;
    menuBox.style.transform = style;
  };

  document.body.onmousemove = e => {
    const xOffset = +((e.x - originPosition.x) / screenWidth).toFixed(3) * 10;
    const yOffset = +((e.y - originPosition.y) / screenHeight).toFixed(3) * 10;
    updateTransformStyle(xOffset, yOffset);
  };
};

const setupMenuButtonEventHandlers = () => {
  const menuBox = document.getElementById("menu-box");
  const mainMenu = document.getElementById("main-menu");
  const createGameMenu = document.getElementById("create-game-menu");
  const joinGameMenu = document.getElementById("join-game-menu");
  const mainMenuCreateButton = document.getElementById("main-menu__create-btn");
  const mainMenuJoinButton = document.getElementById("main-menu__join-btn");
  const createGameMenuBackButton = document.getElementById("create-game-menu__back-btn");
  const joinGameMenuBackButton = document.getElementById("join-game-menu__back-btn");
  const joinGameMenuJoinButton = document.getElementById("join-game-menu__join-btn");

  mainMenuCreateButton.addEventListener("click", () => {
    mainMenu.classList.add("hidden");
    createGameMenu.classList.remove("hidden");
  });

  mainMenuJoinButton.addEventListener("click", () => {
    mainMenu.classList.add("hidden");
    joinGameMenu.classList.remove("hidden");
  });

  createGameMenuBackButton.addEventListener("click", () => {
    mainMenu.classList.remove("hidden");
    createGameMenu.classList.add("hidden");
  });

  joinGameMenuBackButton.addEventListener("click", () => {
    mainMenu.classList.remove("hidden");
    joinGameMenu.classList.add("hidden");
  });

  joinGameMenuJoinButton.addEventListener("click", () => {
    menuBox.classList.add("hidden");

    // TODO: Debugging purposes
    const game = new GameCore();
    game.start();
  });
};
