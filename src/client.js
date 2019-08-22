let menuState = {
  enteredGameName: "",
  enteredGamePassword: "",
  selectedGame: null
};

window.onload = function () {

  setupMenuBoxAnimation();
  setupMenuEventHandlers();

};

const onGameListItemClicked = e => {
  const joinGameMenuJoinButton = document.getElementById("join-game-menu__join-btn");
  const joinGameMenuListItems = document.querySelectorAll("#join-game-menu .list-item");
  const listItem = e.target;
  
  joinGameMenuListItems.forEach(li => li.classList.remove("selected"));
  listItem.classList.add("selected");
  joinGameMenuJoinButton.classList.remove("disabled");
  
  menuState.selectedGame = listItem.innerText;
};

const getAvailableGames = async () => {
  const joinGameMenuList = document.querySelector("#join-game-menu .list");
  while (joinGameMenuList.firstChild) {
    joinGameMenuList.removeChild(joinGameMenuList.firstChild);
  }

  await fetch("api/games")
    .then(res => res.json())
    .then(games => {
      if (!games.length) { return; }

      games.forEach(gameName => {
        const li = document.createElement("li");
        li.classList.add("list-item");
        li.innerText = gameName;

        joinGameMenuList.appendChild(li);

        li.onclick = onGameListItemClicked;
      });
    });
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

const setupMenuEventHandlers = () => {
  const menuContainer = document.getElementById("menu-container");
  const mainMenu = document.getElementById("main-menu");
  const mainMenuCreateButton = document.getElementById("main-menu__create-btn");
  const mainMenuJoinButton = document.getElementById("main-menu__join-btn");
  const createGameMenu = document.getElementById("create-game-menu");
  const createGameMenuGameNameInput = document.getElementById("game-name-input");
  const createGameMenuGamePasswordInput = document.getElementById("game-password-input");
  const createGameMenuCreateButton = document.getElementById("create-game-menu__create-btn");
  const createGameMenuBackButton = document.getElementById("create-game-menu__back-btn");
  const joinGameMenu = document.getElementById("join-game-menu");
  const joinGameMenuBackButton = document.getElementById("join-game-menu__back-btn");
  const joinGameMenuJoinButton = document.getElementById("join-game-menu__join-btn");

  mainMenuCreateButton.addEventListener("click", () => {
    mainMenu.classList.add("hidden");
    createGameMenu.classList.remove("hidden");
  });

  mainMenuJoinButton.addEventListener("click", async () => {
    await getAvailableGames();

    mainMenu.classList.add("hidden");
    joinGameMenu.classList.remove("hidden");
  });

  createGameMenuGameNameInput.addEventListener("keyup", e => {
    if (!e.target.value) {
      createGameMenuCreateButton.classList.add("disabled");
      return;
    }

    menuState.enteredGameName = e.target.value;
    createGameMenuCreateButton.classList.remove("disabled");
  });

  createGameMenuGamePasswordInput.addEventListener("keyup", e => {
    if (!e.target.value) { return; }

    menuState.enteredGamePassword = e.target.value;
  });

  createGameMenuCreateButton.addEventListener("click", async () => {
    const isGameCreated = await sendPostRequest("api/games", {
      name: menuState.enteredGameName,
      password: menuState.enteredGamePassword
    });

    if (!isGameCreated) {
      return;
    }


    // TODO: join that game


    createGameMenuGameNameInput.value = "";
    createGameMenuGamePasswordInput.value = "";
    menuState.enteredGameName = "";
    menuState.enteredGamePassword = "";

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

  joinGameMenuJoinButton.addEventListener("click", () => {
    if (!menuState.selectedGame) { return; }

    menuContainer.classList.add("hidden");

    startGame();
  });
};

const startGame = () => {
  const socket = io.connect();
  socket.emit("game-request", menuState.selectedGame);

  socket.on("connection-success", data => {
    const game = new GameCore(socket, data.id);
    game.start();
  });

  socket.on("connection-fail", data => {
    alert("Connection failed.");
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
