const state = {
  socket: null,
  gameInstance: null,
  playerName: "",
  playerColor: 0xffffff,
  createMenu: {
    enteredGameName: "",
    enteredGamePassword: ""
  },
  joinMenu: {
    selectedGameName: null,
    enteredGamePassword: ""
  }
};

const colorPalette = {
  red: 0xff3d3d,
  green: 0x40ff43,
  blue: 0x3367ff,
  yellow: 0xeded2f,
  orange: 0xffa940,
  purple: 0x9940ff,
  cyan: 0x40ffec,
  lime: 0xafff40,
  pink: 0xff40b6,
  white: 0xffffff,
};

window.onload = async function () {

  // Menu elements
  const menuContainer = document.getElementById("menu-container");
  const menuBox = document.getElementById("menu-box");
  const menuButtons = document.querySelectorAll("button");
  const playerShipContainer = document.getElementById("player-creation-menu__ship-container");
  const colorPaletteItems = document.querySelectorAll(".color-palette__item");
  const playerCreationMenu = document.getElementById("player-creation-menu");
  const playerCreationMenuPlayerNameInput = document.getElementById("player-creation-menu__player-name-input");
  const playerCreationMenuContinueButton = document.getElementById("player-creation-menu__continue-btn");
  const mainMenu = document.getElementById("main-menu");
  const mainMenuCreateButton = document.getElementById("main-menu__create-btn");
  const mainMenuJoinButton = document.getElementById("main-menu__join-btn");
  const mainMenuBackButton = document.getElementById("main-menu__back-btn");
  const createGameMenu = document.getElementById("create-game-menu");
  const createGameMenuGameNameInput = document.getElementById("create-game-menu__game-name-input");
  const createGameMenuGamePasswordInput = document.getElementById("create-game-menu__game-password-input");
  const createGameMenuCreateButton = document.getElementById("create-game-menu__create-btn");
  const createGameMenuBackButton = document.getElementById("create-game-menu__back-btn");
  const joinGameMenu = document.getElementById("join-game-menu");
  const joinGameMenuBackButton = document.getElementById("join-game-menu__back-btn");
  const joinGameMenuJoinButton = document.getElementById("join-game-menu__join-btn");
  const joinGameMenuList = document.querySelector("#join-game-menu .list");
  const joinGameMenuListItems = document.querySelectorAll("#join-game-menu .list-item");
  const joinGameMenuGamePasswordField = document.getElementById("join-game-menu__game-password-field");
  const joinGameMenuGamePasswordInput = document.querySelector("#join-game-menu__game-password-field > input");

  // In-game elements
  const playerReadyModal = document.getElementById("player-ready-modal");
  const playerReadyModalButton = document.getElementById("player-ready-modal__btn");
  const playerReadyModalPressBtnText = document.getElementById("player-ready-modal__press-button-text");
  const playerReadyModalWaitingText = document.getElementById("player-ready-modal__waiting-text");
  const gameContainer = document.getElementById("game-container");
  const exitGameModal = document.getElementById("exit-game-modal");
  const exitGameModalButton = document.getElementById("exit-game-modal__btn");
  const gameStartCoutdownNumber = document.getElementById("game-start-countdown-number");
  const gameEndModal = document.getElementById("game-end-modal");

  const onGameListItemClicked = e => {
    const listItem = e.target;
    
    joinGameMenuJoinButton.classList.remove("disabled");
    joinGameMenuGamePasswordField.classList.add("hidden");
    joinGameMenuListItems.forEach(li => li.classList.remove("selected"));
    listItem.classList.add("selected");
    
    state.joinMenu.selectedGameName = listItem.innerText;
  
    if (listItem.isPasswordLocked) {
      joinGameMenuGamePasswordField.classList.remove("hidden");
    }
  
    createjs.Sound.play("btn-click").volume = 0.3;
  };
  
  const getAvailableGames = async () => {
    while (joinGameMenuList.firstChild) {
      joinGameMenuList.removeChild(joinGameMenuList.firstChild);
    }
  
    await fetch("api/games")
      .then(res => res.json())
      .then(games => {
        if (!games.length) { return; }
  
        games.forEach(game => {
          const li = document.createElement("li");
          li.classList.add("list-item");
  
          li.innerText = game.name;
          li.isPasswordLocked = game.isPasswordLocked;
          li.onclick = onGameListItemClicked;
  
          joinGameMenuList.appendChild(li);
        });
      });
  };
  
  const loadTextures = async () => {
    return new Promise((resolve, reject) => {
      PIXI.loader.add([
        "assets/player_ship.png",
        "assets/thrust_fire.png",
        "assets/wormhole.png",
        "assets/basic_projectile.png",
        "assets/game_background.png",
        "assets/health_pickup.png",
        "assets/shield_pickup.png",
        "assets/player_shield.png",
        "assets/ship_explosion/1.png",
        "assets/ship_explosion/2.png",
        "assets/ship_explosion/3.png",
        "assets/ship_explosion/4.png",
        "assets/ship_explosion/5.png",
        "assets/ship_explosion/6.png",
        "assets/ship_explosion/7.png",
        "assets/ship_explosion/8.png",
        "assets/ship_explosion/9.png"
      ])
      .load(resolve);
    });
  };
  
  const loadSounds = async () => {
    return new Promise((resolve, reject) => {
  
      resolve();
    });
  };
  
  const initPlayerShipColorPalette = () => {
    const pixiApp = new PIXI.Application({ width: 120, height: 120, transparent: true });
    playerShipContainer.appendChild(pixiApp.view);
  
    let playerShipSprite = new PIXI.Sprite(PIXI.loader.resources["assets/player_ship.png"].texture);
    playerShipSprite.width = 70;
    playerShipSprite.height = 100;
    playerShipSprite.anchor.set(0.5);
    playerShipSprite.x = 60;
    playerShipSprite.y = 60;
    pixiApp.stage.addChild(playerShipSprite);

    let playerPreviewTint = state.playerColor;

    colorPaletteItems.forEach(item => {
      item.addEventListener("click", () => {
        colorPaletteItems.forEach(i => { i.classList.remove("active"); });
        item.classList.add("active");

        const color = item.getAttribute("color");
        playerPreviewTint = colorPalette[color];
      });
    });
  
    pixiApp.ticker.add(() => {
      playerShipSprite.rotation += 0.01;
      playerShipSprite.tint = playerPreviewTint;
    }); 
  };
  
  const initMenuState = () => {
    const existingPlayer = getStoredPlayer();

    if (existingPlayer) {
      playerCreationMenu.classList.add("hidden");
      mainMenu.classList.remove("hidden");
      playerCreationMenuContinueButton.classList.remove("disabled");

      state.playerName = existingPlayer.name;
      state.playerColor = colorPalette[existingPlayer.color];

      playerCreationMenuPlayerNameInput.value = existingPlayer.name;
      colorPaletteItems.forEach(i => { i.classList.remove("active"); });
      colorPaletteItems.forEach(item => {
        if (item.getAttribute("color") === existingPlayer.color) {
          item.classList.add("active");
        }
      });
    } else {
      playerCreationMenu.classList.remove("hidden");
    }
  };
  
  const initMenuSounds = () => {
    createjs.Sound.registerSound("sounds/button_click.mp3", "btn-click");
    createjs.Sound.registerSound("sounds/button_hover.mp3", "btn-hover");
    createjs.Sound.registerSound("sounds/countdown_tick.mp3", "countdown-tick");
  
    menuButtons.forEach(button => {
      button.onmouseenter = () => {
        createjs.Sound.play("btn-hover").volume = 0.3;
      };
      button.onclick = () => {
        createjs.Sound.play("btn-click").volume = 0.5;
      };
    });
  
    colorPaletteItems.forEach(item => {
      item.onclick = () => {
        createjs.Sound.play("btn-click").volume = 0.5;
      };
    });
  };
  
  const initMenuBoxAnimation = () => {
    const screenWidth = document.body.clientWidth;
    const screenHeight = document.body.clientHeight;
  
    const originPosition = {
      x: screenWidth * 0.5,
      y: screenHeight * 0.7
    };
  
    const updateTransformStyle = (x, y) => {
      const style = `translate(-50%, -50%) rotateX(${-y}deg) rotateY(${x}deg)`;
      menuBox.style.transform = style;
    };
  
    document.body.onmousemove = e => {
      if (state.gameInstance) { return; }
  
      const xOffset = +((e.x - originPosition.x) / screenWidth).toFixed(3) * 10;
      const yOffset = +((e.y - originPosition.y) / screenHeight).toFixed(3) * 10;
      updateTransformStyle(xOffset, yOffset);
    };
  };
  
  const initMenuEventHandlers = () => {
    playerCreationMenuPlayerNameInput.addEventListener("keyup", e => {
      if (!e.target.value) {
        playerCreationMenuContinueButton.classList.add("disabled");
        return;
      }
  
      playerCreationMenuContinueButton.classList.remove("disabled");
    });
  
    playerCreationMenuContinueButton.addEventListener("click", () => {
      playerCreationMenu.classList.add("hidden");
      mainMenu.classList.remove("hidden");

      savePlayerData();
    });
  
    mainMenuCreateButton.addEventListener("click", () => {
      mainMenu.classList.add("hidden");
      createGameMenu.classList.remove("hidden");
    });
  
    mainMenuJoinButton.addEventListener("click", async () => {
      await getAvailableGames();
  
      mainMenu.classList.add("hidden");
      joinGameMenu.classList.remove("hidden");
      joinGameMenuGamePasswordField.classList.add("hidden");
      joinGameMenuJoinButton.classList.add("disabled");
    });
  
    mainMenuBackButton.addEventListener("click", () => {
      mainMenu.classList.add("hidden");
      playerCreationMenu.classList.remove("hidden");
    });
  
    createGameMenuGameNameInput.addEventListener("keyup", e => {
      if (!e.target.value) {
        createGameMenuCreateButton.classList.add("disabled");
        return;
      }
  
      state.createMenu.enteredGameName = e.target.value;
      createGameMenuCreateButton.classList.remove("disabled");
    });
  
    createGameMenuGamePasswordInput.addEventListener("keyup", e => {
      if (!e.target.value) { return; }
  
      state.joinMenu.enteredGamePassword = e.target.value;
    });
  
    createGameMenuCreateButton.addEventListener("click", async () => {
      const isGameCreated = await sendPostRequest("api/games", {
        name: state.createMenu.enteredGameName,
        password: state.joinMenu.enteredGamePassword
      });
  
      if (!isGameCreated) {
        return;
      }
  
      createGameMenuGameNameInput.value = "";
      createGameMenuGamePasswordInput.value = "";
      state.createMenu.enteredGameName = "";
      state.joinMenu.enteredGamePassword = "";
  
      mainMenu.classList.remove("hidden");
      createGameMenu.classList.add("hidden");
      createGameMenuCreateButton.classList.add("disabled");
    });
  
    createGameMenuBackButton.addEventListener("click", () => {
      mainMenu.classList.remove("hidden");
      createGameMenu.classList.add("hidden");
    });
  
    joinGameMenuBackButton.addEventListener("click", () => {
      mainMenu.classList.remove("hidden");
      joinGameMenu.classList.add("hidden");
    });
  
    joinGameMenuJoinButton.addEventListener("click", onJoinGameClick);
  
    document.addEventListener("keyup", e => {
      if (!state.gameInstance) { return; }
  
      if (e.key === "Escape") {
        if (exitGameModal.classList.contains("hidden")) {
          exitGameModal.classList.remove("hidden");
        } else {
          exitGameModal.classList.add("hidden");
        }
      }
    });
  
    exitGameModalButton.addEventListener("click", () => {
      menuContainer.classList.remove("hidden");
      gameContainer.classList.add("hidden");
      exitGameModal.classList.add("hidden");
  
      state.gameInstance.destroy();
      state.gameInstance = null;
      state.socket.close();
    });
  
    playerReadyModalButton.addEventListener("click", () => {
      playerReadyModalButton.classList.add("hidden");
      playerReadyModalPressBtnText.classList.add("hidden");
      playerReadyModalWaitingText.classList.remove("hidden");
  
      handlePlayerReady();
    });
  };
  
  const savePlayerData = () => {
    let name = playerCreationMenuPlayerNameInput.value;
    let color = null;
    
    colorPaletteItems.forEach(item => {
      if (item.classList.contains("active")) {
        color = item.getAttribute("color");
        return;
      }
    });

    state.playerName = name;
    state.playerColor = colorPalette[color];

    const stringifiedPlayer = JSON.stringify({
      name: name,
      color: color
    });

    localStorage.setItem("player", stringifiedPlayer);
  };
  
  const getStoredPlayer = () => {
    const storedItem = localStorage.getItem("player");
    return storedItem && JSON.parse(storedItem);
  };
  
  const resetInGameUI = () => {
    playerReadyModal.classList.remove("hidden");
    playerReadyModalButton.classList.remove("hidden");
    playerReadyModalPressBtnText.classList.remove("hidden");
    playerReadyModalWaitingText.classList.add("hidden");
    gameEndModal.classList.add("hidden");
  };
  
  const onJoinGameClick = async () => {
    if (!state.joinMenu.selectedGameName) { return; }
  
    state.joinMenu.enteredGamePassword = joinGameMenuGamePasswordInput.value;
  
    try {
      await establishGameConnection();
  
      resetInGameUI();
      menuContainer.classList.add("hidden");
      gameContainer.classList.remove("hidden");
    }
    catch (error) {
      alert(error);
    }
  };
  
  const establishGameConnection = () => {
    return new Promise((resolve, reject) => {
  
      state.socket = io.connect();
      state.socket.emit("game-request", {
        name: state.joinMenu.selectedGameName,
        password: state.joinMenu.enteredGamePassword,
        playerName: state.playerName,
        playerColor: state.playerColor
      });
    
      state.socket.on("connection-success", data => {
        state.gameInstance = new GameCore(state.socket, data.id, state.playerName, state.playerColor);
  
        state.gameInstance.registerEventListener("game-end-message", message => {
          gameEndModal.innerHTML = message;
          gameEndModal.classList.remove("hidden");
        });
  
        resolve();
      });
    
      state.socket.on("connection-fail", () => {
        reject("Connection failed.");
      });
  
      state.socket.on("game-start-countdown", secondsToStart => {
        playerReadyModal.classList.add("hidden");
        gameStartCoutdownNumber.classList.remove("hidden");
  
        if (secondsToStart > 0) {
          gameStartCoutdownNumber.innerHTML = secondsToStart;
          createjs.Sound.play("countdown-tick").volume = 0.5;
        }
  
        if (secondsToStart === 0) {
          gameStartCoutdownNumber.classList.add("hidden");
          state.gameInstance.start();
        }
      });
    });
  };
  
  const handlePlayerReady = () => {
    state.socket.emit("player-ready", {
      gameName: state.joinMenu.selectedGameName
    });
  };
  
  const sendPostRequest = async (url, data) => {
    const rawResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
  
    return rawResponse.ok;
  };

  // Initialization
  await loadTextures();
  await loadSounds();

  initMenuState();
  initPlayerShipColorPalette();
  initMenuSounds();
  initMenuBoxAnimation();
  initMenuEventHandlers();

};
