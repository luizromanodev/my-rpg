import { database, loadDatabase } from "./data/database.js";

// ==========================================
// 1. ELEMENTOS DA INTERFACE (DOM)
// ==========================================
const btnAttack = document.getElementById("btn-attack");
const btnPotion = document.getElementById("btn-potion");
const btnSkill = document.getElementById("btn-skill");
const btnFlee = document.getElementById("btn-flee");
const battleLog = document.getElementById("battle-log");
const uiGoldCounter = document.getElementById("gold-counter");

const screenLogin = document.getElementById("screen-login");
const screenTavern = document.getElementById("screen-tavern");
const screenBattle = document.getElementById("screen-battle");

const inputUser = document.getElementById("input-username");
const inputPass = document.getElementById("input-password");
const btnLogin = document.getElementById("btn-login");
const btnRegister = document.getElementById("btn-register");
const loginMsg = document.getElementById("login-msg");
const btnStartAdventure = document.getElementById("btn-start-adventure");

const rosterContainer = document.getElementById("character-roster");

const heroTeamContainer = document.getElementById("hero-team-container");
const enemyTeamContainer = document.getElementById("enemy-team-container");
const turnIndicator = document.getElementById("turn-indicator");
const dungeonName = document.getElementById("dungeon-name");
const dungeonRoom = document.getElementById("dungeon-room");

const screenMap = document.getElementById("screen-map");
const screenShop = document.getElementById("screen-shop");
const shopGoldCounter = document.getElementById("shop-gold-counter");
const worldMapsContainer = document.getElementById("world-maps-container");
const mapGoldCounter = document.getElementById("map-gold-counter");

const screenAccountSelect = document.getElementById("screen-account-select");
const screenHome = document.getElementById("screen-home");
const screenSlotSelect = document.getElementById("screen-slot-select");
const slotList = document.getElementById("slot-list");
const accountList = document.getElementById("account-list");
const btnShowLogin = document.getElementById("btn-show-login");
const homePlayerName = document.getElementById("home-player-name");
const homeGoldCounter = document.getElementById("home-gold-counter");
const homeTeamContainer = document.getElementById("home-team-container");

const modalGameOver = document.getElementById("modal-game-over");
const modalGameOverContent = document.getElementById("modal-game-over-content");
const btnRetryDungeon = document.getElementById("btn-retry-dungeon");
const btnReturnMap = document.getElementById("btn-return-map");

const modalInventory = document.getElementById("modal-inventory");
const inventoryContent = document.getElementById("inventory-content");
const btnCloseInventory = document.getElementById("btn-close-inventory");

// Navegação da Home e Botões de Voltar
document.getElementById("nav-btn-map").addEventListener("click", () => {
  showScreen("screen-map");
  renderMapScreen();
});
document.getElementById("nav-btn-tavern").addEventListener("click", () => {
  showScreen("screen-tavern");
  renderTavern();
});
document.getElementById("btn-back-home-map").addEventListener("click", () => {
  renderHome();
  showScreen("screen-home");
});
document.getElementById("btn-back-home-tavern").addEventListener("click", () => {
  renderHome();
  showScreen("screen-home");
});

document.getElementById("btn-back-home-shop").addEventListener("click", () => {
  renderHome();
  showScreen("screen-home");
});

// ==========================================
// 2. ESTADO DO JOGO E SAVE
// ==========================================
let currentUser = null;
let currentSlotIndex = null;
let playerInventory = [];

let playerRoster = [];
let activeTeamIds = []

let myGroup = {
  name: "Grupo do Herói",
  gold: 0,
  members: [],
  dungeonsCleared: 0,
};
let gameState = {
  enemiesLive: [],
  turnQueue: [],
  activeCharacter: null,
  selectedTarget: null,
  currentRoom: 1,
  maxRooms: 10,
  currentMapId: null,
  sessionRewards: { gold: 0, exp: 0, drops: [], levelUps: [] },
};

let turnTimer = null;

myGroup.dungeonsCleared = 0;

// ==========================================
// AUTO-SAVE DE COMBATE
// ==========================================
function saveMidBattle() {
  if (!currentUser) return;
  const stateToSave = {
    currentMapId: gameState.currentMapId,
    currentDungeonIndex: gameState.currentDungeonIndex,
    currentRoom: gameState.currentRoom,
    enemiesLive: gameState.enemiesLive,
    sessionRewards: gameState.sessionRewards,
  };
  fetch("http://localhost:3000/api/save-battle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: currentUser,
      slotIndex: currentSlotIndex,
      team: { roster: playerRoster, activeIds: activeTeamIds },
      dungeonState: stateToSave,
      inventory: playerInventory,
    }),
  });
}

function clearMidBattle() {
  if (!currentUser) return;
  fetch("http://localhost:3000/api/save-battle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: currentUser,
      slotIndex: currentSlotIndex,
      team: { roster: playerRoster, activeIds: activeTeamIds },
      dungeonState: null,
    }),
  });
}

// ==========================================
// 3. GERENCIAMENTO DE TELAS E CONTAS
// ==========================================
function showScreen(screenId) {
  screenAccountSelect.classList.add("d-none");
  screenLogin.classList.add("d-none");
  screenSlotSelect.classList.add("d-none");
  screenHome.classList.add("d-none");
  screenTavern.classList.add("d-none");
  screenMap.classList.add("d-none");
  screenShop.classList.add("d-none")
  screenBattle.classList.add("d-none");

  document.getElementById(screenId).classList.remove("d-none");
}

let userSlotsData = [];

function getSavedAccounts() {
  return JSON.parse(localStorage.getItem("rpg_saved_accounts")) || [];
}

function saveAccountLocal(username) {
  let accounts = getSavedAccounts();
  if (!accounts.includes(username)) {
    accounts.push(username);
    if (accounts.length > 2) accounts.shift();
    localStorage.setItem("rpg_saved_accounts", JSON.stringify(accounts));
  }
}

function renderAccountSelect() {
  const accounts = getSavedAccounts();
  accountList.innerHTML = "";
  if (accounts.length === 0) return showScreen("screen-login");

  accounts.forEach((acc) => {
    const col = document.createElement("div");
    col.className = "col-md-5";
    col.innerHTML = `
    <div class="card p-4 border-info shadow" style="cursor: pointer; transition: 0.2s;" onmouseover="this.classList.add('border-warning')" onmouseout="this.classList.remove('border-warning')" onclick="autoLogin('${acc}')">
        <i class="bi bi-person-badge fs-1 text-info mb-2 d-block"></i><h4 class="text-light m-0">${acc}</h4>
      </div>`;
    accountList.appendChild(col);
  });

  btnShowLogin.classList.toggle("d-none", accounts.length >= 2);
  showScreen("screen-account-select");
}

if (btnShowLogin) {
  btnShowLogin.addEventListener("click", () => showScreen("screen-login"));
}

window.autoLogin = async function (username) {
  inputUser.value = username;
  inputPass.value = "";
  inputPass.focus();

  showScreen("screen-login");

  loginMsg.innerText = `Digite a senha para ${username}`;
  loginMsg.className = "mt-3 mb-0 fw-bold text-info";
};

async function handleAccount(action) {
  const username = inputUser.value.trim();
  const password = inputPass.value.trim();

  if (!username || !password) {
    loginMsg.innerText = "Preencha todos os campos.";
    loginMsg.className = "mt-3 mb-0 fw-bold text-danger";
    return;
  }

  loginMsg.innerText = "Conectando ao Servidor...";
  loginMsg.className = "mt-3 mb-0 fw-bold text-info";

  try {
    const res = await fetch(`http://localhost:3000/api/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      loginMsg.innerText = data.error;
      loginMsg.className = "mt-3 mb-0 fw-bold text-danger";
    } else {
      loginMsg.innerText = "Conectado!";
      loginMsg.className = "mt-3 mb-0 fw-bold text-success";

      if (action === "register") {
        saveAccountLocal(username);
        setTimeout(() => handleAccount("login"), 1000);
      }

      if (action === "login") {
        currentUser = username;
        saveAccountLocal(username);
        userSlotsData = data.saveData.slots || [null, null, null];
        renderSlotSelection();
      }
    }
  } catch (err) {
    loginMsg.innerText = "Servidor offline.";
  }
}

function renderSlotSelection() {
  slotList.innerHTML = "";

  for (let i = 0; i < 3; i++) {
    const slot = userSlotsData[i];
    const col = document.createElement("div");
    col.className = "col-md-4";

    if (slot && slot.team && slot.team.length > 0) {
      // SLOT OCUPADO
      const leader = slot.team[0];
      col.innerHTML = `
        <div class="card p-3 border-success shadow" style="cursor: pointer; transition: 0.2s;" onmouseover="this.classList.add('border-warning')" onmouseout="this.classList.remove('border-warning')" onclick="selectSlot(${i}, true)">
          <h5 class="text-success mb-2">Slot ${i + 1}</h5>
          <i class="bi bi-person-fill text-light fs-1"></i>
          <strong class="d-block text-info mt-2">${leader.name} +2</strong>
          <small class="text-warning"><i class="bi bi-coin"></i> ${slot.gold} Ouro</small><br>
          <small class="text-secondary">Progresso: Mapa ${slot.dungeonsCleared}</small>
        </div>
      `;
    } else {
      // SLOT VAZIO
      col.innerHTML = `
        <div class="card p-4 border-secondary shadow opacity-75" style="cursor: pointer; transition: 0.2s;" onmouseover="this.classList.add('border-info')" onmouseout="this.classList.remove('border-info')" onclick="selectSlot(${i}, false)">
          <h5 class="text-secondary mb-3">Slot ${i + 1}</h5>
          <i class="bi bi-plus-circle-dotted text-secondary fs-1 mb-2"></i>
          <strong class="d-block text-light mt-2">Criar Novo Herói</strong>
        </div>
      `;
    }
    slotList.appendChild(col);
  }
  showScreen("screen-slot-select");
}

window.selectSlot = function (index, isOccupied) {
  currentSlotIndex = index;

  if (isOccupied) {
    const slotData = userSlotsData[index];
    myGroup.gold = slotData.gold || 0;
    myGroup.dungeonsCleared = slotData.dungeonsCleared || 0;
    playerInventory = slotData.inventory || [];
    if (slotData.team && !Array.isArray(slotData.team)) {
      playerRoster = slotData.team.roster || [];
      activeTeamIds = slotData.team.activeIds || [];
    } else {
      playerRoster = slotData.team || [];
      activeTeamIds = playerRoster.map(h => h.id)
    }

    if (playerRoster.length === 0 && database.characters.length >= 3) {
      playerRoster.push(structuredClone(database.characters[0]));
      playerRoster.push(structuredClone(database.characters[1]));
      playerRoster.push(structuredClone(database.characters[2]));
      activeTeamIds = playerRoster.map(h => h.id);
    }

    myGroup.members = playerRoster.filter(h => activeTeamIds.includes(h.id));

    if (slotData.dungeonState) {
      // Restaura Batalha
      gameState.currentMapId = slotData.dungeonState.currentMapId;
      gameState.currentDungeonIndex = slotData.dungeonState.currentDungeonIndex;
      gameState.currentRoom = slotData.dungeonState.currentRoom;
      gameState.enemiesLive = slotData.dungeonState.enemiesLive;
      gameState.sessionRewards = slotData.dungeonState.sessionRewards;

      showScreen("screen-battle");
      battleLog.innerHTML = "";
      logMessage(
        `Batalha Restaurada! Sala ${gameState.currentRoom}.`,
        "text-info fw-bold",
      );
      buildTurnQueue();
      processNextTurn();
    } else {
      renderHome();
      showScreen("screen-home");
    }
  } else {
    myGroup.gold = 0;
    myGroup.dungeonsCleared = 0;
    playerInventory = [];
    myGroup.members = [];
    playerRoster = [];
    activeTeamIds = [];

    // Mostra a tela de Gacha Inicial
    document.getElementById("modal-initial-gacha").classList.remove("d-none");

    // Pega 3 heróis ÚNICOS aleatórios do banco de dados
    let pool = [...database.characters];
    let initialHeroes = [];

    for (let i = 0; i < 3; i++) {
      let randomIndex = Math.floor(Math.random() * pool.length);
      initialHeroes.push(structuredClone(pool[randomIndex]));
      pool.splice(randomIndex, 1); // Remove da pool para não vir repetido no time inicial
    }

    // Define o time inicial
    playerRoster = initialHeroes;
    activeTeamIds = initialHeroes.map(h => h.id);
    myGroup.members = playerRoster;

    // Renderiza os 3 heróis sorteados na tela
    const resultsContainer = document.getElementById("initial-gacha-results");
    resultsContainer.innerHTML = "";

    initialHeroes.forEach(hero => {
      const col = document.createElement("div");
      col.className = "col-10 col-md-3 mb-2";
      col.innerHTML = `
        <div class="card p-3 border-warning text-center shadow-lg h-100 bg-dark" style="animation: pulse-gold 2s infinite alternate;">
          <h4 class="text-warning">${hero.name}</h4>
          <div class="mb-2">${getStarsHTML(hero.stars)}</div>
          <span class="badge bg-secondary mb-2">${hero.role}</span>
          <p class="text-light mt-2" style="font-size: 0.85rem;">HP: ${hero.stats.max_hp} | ATQ: ${hero.stats.base_attack}</p>
        </div>
      `;
      resultsContainer.appendChild(col);
    });
  }
};

function renderHome() {
  homePlayerName.innerText = currentUser;
  homeGoldCounter.innerText = myGroup.gold;
  homeTeamContainer.innerHTML = "";

  myGroup.members.forEach((hero) => {
    const col = document.createElement("div");
    col.className = "col-4 col-md-3";
    let classIcon = "bi-person";
    if (hero.role === "Tanque") classIcon = "bi-shield-shaded";
    if (hero.role === "Mago") classIcon = "bi-magic";
    if (hero.role === "Guerreiro") classIcon = "bi-sword";
    if (hero.role === "Curandeiro" || hero.role === "Suporte")
      classIcon = "bi-heart-pulse-fill";

    col.innerHTML = `
    <div class="card p-3 bg-dark border-secondary text-center h-100 shadow" style="cursor: pointer" onclick="showHeroDetailsById('${hero.id}')">
        <i class="bi ${classIcon} text-info mb-2" style="font-size: 3rem;"></i>
        <h5 class="text-light mb-1" style="font-size: 1.1rem;">${hero.name}</h5>
        <div class="mb-2">${getStarsHTML(hero.stars)}</div>
        <span class="badge bg-secondary mb-2">Nível ${hero.level || 1}</span>
        <div class="progress mt-auto" style="height: 5px;"><div class="progress-bar bg-success" style="width: ${(hero.stats.current_hp / hero.stats.max_hp) * 100}%"></div></div>
      </div>`;
    homeTeamContainer.appendChild(col);
  });
}

btnLogin.addEventListener("click", () => handleAccount("login"));
btnRegister.addEventListener("click", () => handleAccount("register"));

btnStartAdventure.addEventListener("click", async () => {
  if (myGroup.members.length !== 3) return;

  try {
    await fetch("http://localhost:3000/api/save-team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: currentUser, slotIndex: currentSlotIndex, team: { roster: playerRoster, activeIds: activeTeamIds } }),
    });
    console.log("Time salvo no servidor com sucesso!");
  } catch (err) {
    console.error("Erro ao salvar time:", err);
  }

  renderHome();
  showScreen("screen-home");
});

// ==========================================
// 4. INICIALIZAÇÃO DO JOGO
// ==========================================
init();

async function init() {
  console.log("Baixando dados do servidor...");
  const dbLoaded = await loadDatabase();

  if (dbLoaded) {
    renderAccountSelect();
  } else {
    loginMsg.innerText =
      "Erro ao carregar o banco de dados. O servidor está ligado?";
    loginMsg.className = "mt-3 mb-0 fw-bold text-danger";
  }
}

// ==========================================
// 5. COLEÇÃO DE HERÓIS E TIME (TAVERNA)
// ==========================================
function renderTavern() {
  rosterContainer.innerHTML = "";

  btnStartAdventure.disabled = activeTeamIds.length !== 3;
  btnStartAdventure.innerText = `Confirmar Time (${activeTeamIds.length}/3)`;
  btnStartAdventure.className = activeTeamIds.length === 3 ? "btn btn-warning btn-lg fw-bold shadow mt-3" : "btn btn-secondary btn-lg fw-bold shadow mt-3";

  // Varre TODOS os personagens que existem no banco de dados
  database.characters.forEach((dbChar) => {
    const col = document.createElement("div");
    col.className = "col-md-3 mb-3";
    const card = document.createElement("div");

    // Verifica se o jogador já possui este herói na coleção
    const ownedHero = playerRoster.find(h => h.id === dbChar.id);
    const isSelected = activeTeamIds.includes(dbChar.id);

    if (ownedHero) {
      // === HERÓI DESBLOQUEADO ===
      card.className = `card p-3 h-100 text-start ${isSelected ? 'border-warning shadow-lg' : 'border-secondary'}`;
      card.style.cursor = "pointer";
      card.style.transition = "transform 0.2s, border-color 0.2s";
      if (isSelected) card.style.transform = "scale(1.05)";

      card.innerHTML = `
        <h4 class="text-warning text-center mb-0">${ownedHero.name}</h4>
        <div class="text-center mb-1 d-flex justify-content-center align-items-center gap-2">
          ${getStarsHTML(ownedHero.stars)} 
          <span class="text-light" style="font-size: 0.8rem;">Lv.${ownedHero.level || 1}</span>
        </div>
        <div class="text-center mb-2">
          <span class="badge bg-info text-dark">${ownedHero.role}</span>
        </div>
        <hr class="border-secondary mt-0 mb-2">
        <div class="d-flex justify-content-between align-items-center">
          <button class="btn btn-sm btn-outline-info" onclick="event.stopPropagation(); showHeroDetailsById('${ownedHero.id}')">
            <i class="bi bi-gear-fill"></i> Equipar
          </button>
          ${isSelected ? '<span class="badge bg-warning text-dark"><i class="bi bi-check-circle-fill"></i> No Time</span>' : ''}
        </div>
      `;

      card.addEventListener("click", () => {
        if (isSelected) {
          activeTeamIds = activeTeamIds.filter(id => id !== ownedHero.id);
        } else {
          if (activeTeamIds.length < 3) activeTeamIds.push(ownedHero.id);
          else return alert("Você só pode levar 3 heróis para a batalha!");
        }
        // Atualiza a equipe ativa e re-renderiza
        myGroup.members = playerRoster.filter(h => activeTeamIds.includes(h.id));
        renderTavern();
      });

    } else {
      // === HERÓI BLOQUEADO ===
      card.className = "card p-3 h-100 text-center border-secondary bg-dark opacity-50";
      card.innerHTML = `
        <i class="bi bi-lock-fill text-secondary" style="font-size: 3rem;"></i>
        <h5 class="text-secondary mt-2">${dbChar.name}</h5>
        <div class="mb-2">${getStarsHTML(dbChar.stars)}</div>
        <span class="badge bg-secondary mb-2">${dbChar.role}</span>
        <small class="text-secondary d-block mt-auto pt-2">Adquira na Loja</small>
      `;
    }

    col.appendChild(card);
    rosterContainer.appendChild(col);
  });
}

// ==========================================
// RENDERIZAR MAPA MUNDI
// ==========================================
function renderMapScreen() {
  mapGoldCounter.innerText = myGroup.gold;
  worldMapsContainer.innerHTML = "";

  database.maps.forEach((map) => {
    // Cria um cabeçalho para o Mapa
    const mapHeader = document.createElement("h4");
    mapHeader.className =
      "text-warning mt-4 mb-2 border-bottom border-secondary pb-1";
    mapHeader.innerText = `🗺️ ${map.name}`;
    worldMapsContainer.appendChild(mapHeader);

    // Lista as 3 Dungeons daquele mapa
    map.dungeons.forEach((dungeon, index) => {
      const isCleared = myGroup.dungeonsCleared > dungeon.requiredClears;
      const isUnlocked = myGroup.dungeonsCleared === dungeon.requiredClears;

      const col = document.createElement("div");
      col.className = "col-md-8 mb-2";

      let cardStyle = "border-secondary bg-secondary opacity-75";
      if (isCleared) cardStyle = "border-success bg-dark opacity-75";
      if (isUnlocked) cardStyle = "border-info bg-dark shadow-lg";

      const card = document.createElement("div");
      card.className = `card p-2 border-2 ${cardStyle}`;
      card.style.cursor = isUnlocked ? "pointer" : "not-allowed";

      let btnClass = "btn-secondary";
      let btnText = "BLOQUEADO";
      if (isCleared) {
        btnClass = "btn-success";
        btnText = "CONCLUÍDO ✔️";
      } else if (isUnlocked) {
        btnClass = "btn-primary";
        btnText = "ENTRAR";
      }

      // Mostra qual é o Boss final daquela Dungeon específica
      let bossText = dungeon.isFinal
        ? `(Boss: ${map.boss[0]})`
        : `(Mini-Boss: ${map.miniBoss[0]})`;

      card.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h5 class="${isUnlocked ? "text-warning" : isCleared ? "text-success" : "text-dark"} m-0">
              ${isUnlocked ? "▶️" : isCleared ? "✅" : "🔒"} ${dungeon.name}
            </h5>
            <small class="${isUnlocked || isCleared ? "text-light" : "text-dark"}">10 Salas ${bossText}</small>
          </div>
          <button class="btn btn-sm ${btnClass} fw-bold" ${!isUnlocked ? "disabled" : ""}>
            ${btnText}
          </button>
        </div>
      `;

      if (isUnlocked) {
        card.addEventListener("click", () => {
          if (
            !document.getElementById("screen-map").classList.contains("d-none")
          ) {
            gameState.currentMapId = map.id;
            gameState.currentDungeonIndex = index; // Guarda em qual dungeon entramos!
            gameState.currentRoom = 1;

            // Atualiza o nome da Dungeon na tela de batalha
            dungeonName.innerText = dungeon.name;

            showScreen("screen-battle");
            startRoom();
          }
        });
      }

      col.appendChild(card);
      worldMapsContainer.appendChild(col);
    });
  });
}

// ==========================================
// 6. ATUALIZAÇÃO DA INTERFACE (UI)
// ==========================================
function updateUI() {
  uiGoldCounter.innerText = myGroup.gold;
  dungeonRoom.innerText = `Sala ${gameState.currentRoom} / ${gameState.maxRooms}`;

  // Atualizar heróis
  heroTeamContainer.innerHTML = "";
  myGroup.members.forEach((hero) => {
    const hpPercent = (hero.stats.current_hp / hero.stats.max_hp) * 100;
    const isDead = hero.stats.current_hp <= 0;
    const isMyTurn =
      gameState.activeCharacter && gameState.activeCharacter.id === hero.id;

    // GERENCIADOR DE ANIMAÇÕES
    let extraClass = "";
    let levelProgressionHtml = "";

    if (hero.justLeveledUp) {
      extraClass = "anim-level-up";

      // === Cria o HTML da progressão de nível ===
      const oldLevel = hero.oldLevelForAnim || (hero.level || 1) - 1;
      levelProgressionHtml = `
        <div class="level-up-overlay">
          <div class="level-up-text">LEVEL UP!</div>
          <div class="level-progression">${oldLevel} > ${hero.level}</div>
        </div>
      `;

      hero.justLeveledUp = false;
    } else if (hero.justDied) {
      extraClass = "anim-death";
      hero.justDied = false;
    } else if (hero.justTookDamage) {
      extraClass = "anim-damage";
      hero.justTookDamage = false;
    } else if (hero.justHealed) {
      extraClass = "anim-heal";
      hero.justHealed = false;
    }

    const card = document.createElement("div");
    card.id = `card-${hero.id}`;
    card.className = `mini-card text-light ${isDead && extraClass !== "anim-death" ? "opacity-50" : ""} ${isMyTurn ? "active-turn" : ""} ${extraClass}`;

    card.innerHTML = `
      ${levelProgressionHtml}
      
      <div class="d-flex align-items-start">
        <strong class="${isDead ? "text-decoration-line-through text-secondary" : "text-info"} me-2">
          ${hero.name} <span class="text-light fs-6 opacity-75 ms-1">Lv.${hero.level || 1}</span>
        </strong>
        <span class="badge bg-secondary ms-auto mt-1">${hero.role}</span>
      </div>
      <div class="mb-1 text-center">
        ${getStarsHTML(hero.stars)}
      </div>
      <p class="mt-1 mb-1">HP: ${Math.max(0, hero.stats.current_hp)} / ${hero.stats.max_hp}</p>
      <div class="progress">
        <div class="progress-bar ${isDead ? "bg-secondary" : "bg-success"}" style="width: ${Math.max(0, hpPercent)}%"></div>
      </div>
    `;

    card.style.cursor = "pointer";
    card.addEventListener("click", () => showHeroDetails(hero));
    heroTeamContainer.appendChild(card);
  });

  // Atualizar inimigos
  enemyTeamContainer.innerHTML = "";
  gameState.enemiesLive.forEach((enemy) => {
    const hpPercent = (enemy.stats.current_hp / enemy.stats.max_hp) * 100;
    const isDead = enemy.stats.current_hp <= 0;
    const isMyTurn =
      gameState.activeCharacter &&
      gameState.activeCharacter.battleId === enemy.battleId;
    const isTarget =
      gameState.selectedTarget &&
      gameState.selectedTarget.battleId === enemy.battleId;

    let extraClass = "";
    if (enemy.justDied) {
      extraClass = "anim-death";
      enemy.justDied = false;
    } else if (enemy.justTookDamage) {
      extraClass = "anim-damage";
      enemy.justTookDamage = false;
    }

    const card = document.createElement("div");
    card.id = `card-${enemy.battleId}`;
    card.className = `mini-card text-light ${isDead && extraClass !== "anim-death" ? "opacity-50" : ""} ${isMyTurn ? "active-turn" : ""} ${isTarget ? "border border-danger border-2" : ""} ${extraClass}`;
    card.style.cursor = isDead ? "default" : "crosshair";

    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <strong class="${isDead ? "text-decoration-line-through text-secondary" : "text-danger"}">
          ${isTarget ? "🎯 " : ""}${enemy.name}
        </strong>
      </div>
      <p class="mt-1 mb-1">HP: ${Math.max(0, enemy.stats.current_hp)} / ${enemy.stats.max_hp}</p>
      <div class="progress">
        <div class="progress-bar ${isDead ? "bg-secondary" : "bg-danger"}" style="width: ${Math.max(0, hpPercent)}%"></div>
      </div>
    `;

    card.addEventListener("click", () => {
      if (!isDead) {
        gameState.selectedTarget = enemy;
        updateUI();
      }
    });

    enemyTeamContainer.appendChild(card);
  });
}

function logMessage(msg, colorClass = "text-light") {
  const p = document.createElement("p");
  p.className = `m-0 ${colorClass}`;
  p.innerText = msg;
  battleLog.appendChild(p);
  battleLog.scrollTop = battleLog.scrollHeight;
}

// ==========================================
// 7. INICIATIVA E PROGRESSÃO DE DUNGEON
// ==========================================
function startRoom() {
  clearTimeout(turnTimer);

  if (gameState.currentRoom === 1) {
    gameState.sessionRewards = { gold: 0, exp: 0, drops: [], levelUps: [] };
    gameState.turnQueue = [];
  }

  gameState.enemiesLive = [];
  gameState.activeCharacter = null;
  gameState.selectedTarget = null;

  const currentMap = database.maps.find((m) => m.id === gameState.currentMapId);
  const currentDungeon = currentMap.dungeons[gameState.currentDungeonIndex];
  const room = gameState.currentRoom;

  let enemyPool = [];
  let numEnemies = Math.floor(Math.random() * 3) + 1;

  // REGRAS DE SPAWN E BOSS
  if (room >= 1 && room <= 4) {
    enemyPool = currentMap.mobsNormal;
  } else if (room >= 6 && room <= 9) {
    enemyPool = currentMap.mobsElite;
  } else if (room === 5) {
    enemyPool = currentMap.miniBoss; // Metade da Dungeon sempre tem Mini-Boss!
    numEnemies = 1;
  } else if (room === 10) {
    if (currentDungeon.isFinal) {
      enemyPool = currentMap.boss; // Última Dungeon tem o Boss Final
    } else {
      enemyPool = currentMap.mobsElite; // Dungeons normais fecham com grupo Elite
      numEnemies = 3;
    }
  }

  const letras = ["A", "B", "C"];

  for (let i = 0; i < numEnemies; i++) {
    const enemyName = enemyPool[Math.floor(Math.random() * enemyPool.length)];
    const enemyData = database.enemies.find((e) => e.name === enemyName);
    const newEnemy = structuredClone(enemyData || database.enemies[0]);

    newEnemy.battleId = `enemy_${i + 1}`;
    newEnemy.name = enemyData ? enemyName : `[Falta Criar] ${enemyName}`;
    if (numEnemies > 1) newEnemy.name = `${newEnemy.name} ${letras[i]}`;

    // APLICA O MULTIPLICADOR DE DIFICULDADE DA DUNGEON
    newEnemy.stats.max_hp = Math.floor(
      newEnemy.stats.max_hp * currentDungeon.diff,
    );
    newEnemy.stats.current_hp = newEnemy.stats.max_hp;
    newEnemy.stats.base_attack = Math.floor(
      newEnemy.stats.base_attack * currentDungeon.diff,
    );
    newEnemy.stats.base_defense = Math.floor(
      newEnemy.stats.base_defense * currentDungeon.diff,
    );

    gameState.enemiesLive.push(newEnemy);
  }

  battleLog.innerHTML = "";
  logMessage(
    `Explorando: ${currentMap.name} - Sala ${room}`,
    "text-info fw-bold",
  );
  logMessage(
    `Um grupo de ${numEnemies} inimigo(s) apareceu!`,
    "text-warning fw-bold",
  );

  // Recalcula a fila de turnos do zero toda vez que entra numa sala nova
  buildTurnQueue();

  saveMidBattle();
  processNextTurn();
}

function buildTurnQueue() {
  const aliveHeroes = myGroup.members.filter((h) => h.stats.current_hp > 0);
  const aliveEnemies = gameState.enemiesLive.filter(
    (e) => e.stats.current_hp > 0,
  );

  let allCombatants = [...aliveHeroes, ...aliveEnemies];
  allCombatants.sort((a, b) => b.stats.speed - a.stats.speed);
  gameState.turnQueue = allCombatants;
}

function processNextTurn() {
  if (gameState.turnQueue.length === 0) {
    buildTurnQueue();
  }

  gameState.activeCharacter = gameState.turnQueue.shift();

  if (gameState.activeCharacter.stats.current_hp <= 0) {
    return processNextTurn();
  }

  const isHero = myGroup.members.some(
    (h) => h.id === gameState.activeCharacter.id,
  );

  if (isHero) {
    logMessage(
      `\nTurno de ${gameState.activeCharacter.name}! O que fará?`,
      "text-info",
    );
    turnIndicator.innerText = `Sua vez: ${gameState.activeCharacter.name}!`;
    turnIndicator.className = "badge bg-primary text-light fs-6 mb-2";

    btnAttack.disabled = false;
    btnSkill.disabled = false;
    btnPotion.disabled = false;
  } else {
    logMessage(
      `\nTurno do Inimigo: ${gameState.activeCharacter.name}...`,
      "text-danger",
    );
    turnIndicator.innerText = `Vez do Inimigo!`;
    turnIndicator.className = "badge bg-danger text-light fs-6 mb-2";

    btnAttack.disabled = true;
    btnSkill.disabled = true;
    btnPotion.disabled = true;

    clearTimeout(turnTimer);
    turnTimer = setTimeout(() => {
      enemyTurnIA();
    }, 1500);
  }

  updateUI();
}

// ==========================================
// 8. MATEMÁTICA E LÓGICA DE COMBATE
// ==========================================
function calculateDamage(attacker, defender) {
  const baseDamage = attacker.stats.base_attack - defender.stats.base_defense;
  return Math.max(baseDamage, 0);
}

function checkHit(attacker, defender) {
  let hitChance = 85;
  const differenceSpeed = attacker.stats.speed - defender.stats.speed;
  hitChance += differenceSpeed * 2;
  hitChance = Math.max(10, Math.min(hitChance, 100));
  const roll = Math.random() * 100;
  return roll < hitChance;
}

function checkCritical(damage) {
  const critChance = 10;
  const roll = Math.random() * 100;
  return roll < critChance ? damage * 2 : damage;
}

// ATAQUE DO HERÓI
btnAttack.addEventListener("click", () => {
  if (!gameState.selectedTarget) {
    logMessage(
      `Selecione um alvo clicando no monstro primeiro!`,
      "text-warning",
    );
    return;
  }

  if (gameState.selectedTarget.stats.current_hp <= 0) {
    logMessage(
      `Este monstro já foi derrotado! Escolha outro alvo.`,
      "text-warning",
    );
    gameState.selectedTarget = null;
    updateUI();
    return;
  }

  btnAttack.disabled = true;
  btnSkill.disabled = true;
  btnPotion.disabled = true;

  const attacker = gameState.activeCharacter;
  const defender = gameState.selectedTarget;

  const attackerCard = document.getElementById(`card-${attacker.id}`);
  if (attackerCard) attackerCard.classList.add("anim-attack-hero");

  setTimeout(() => {
    if (!checkHit(attacker, defender)) {
      logMessage(
        `O ataque de ${attacker.name} ERROU! (Esquiva)`,
        "text-secondary",
      );
    } else {
      let baseDamage = calculateDamage(attacker, defender);
      const finalDamage = checkCritical(baseDamage);

      if (finalDamage > baseDamage)
        logMessage(`ACERTO CRÍTICO!`, "text-warning fw-bold");

      defender.stats.current_hp -= finalDamage;
      logMessage(
        `${attacker.name} atacou ${defender.name} e causou ${finalDamage} de dano!`,
      );

      if (defender.stats.current_hp <= 0) {
        defender.justDied = true;
        logMessage(`${defender.name} foi derrotado!`, "text-success fw-bold");
        gameState.selectedTarget = null;
      } else {
        defender.justTookDamage = true;
      }
    }

    updateUI();

    if (!checkBattleEnd()) {
      saveMidBattle();
      clearTimeout(turnTimer);
      turnTimer = setTimeout(() => {
        processNextTurn();
      }, 1200);
    }
  }, 300);
});

// I.A DO MONSTRO
function enemyTurnIA() {
  const attacker = gameState.activeCharacter;
  const aliveHeroes = myGroup.members.filter((h) => h.stats.current_hp > 0);

  if (aliveHeroes.length === 0) {
    logMessage(`Seu grupo foi totalmente aniquilado...`, "text-danger fw-bold");
    return;
  }

  const target = aliveHeroes[Math.floor(Math.random() * aliveHeroes.length)];

  const attackerCard = document.getElementById(`card-${attacker.battleId}`);
  if (attackerCard) attackerCard.classList.add("anim-attack-enemy");

  setTimeout(() => {
    if (!checkHit(attacker, target)) {
      logMessage(
        `O ataque de ${attacker.name} ERROU ${target.name}!`,
        "text-secondary",
      );
    } else {
      let baseDamage = calculateDamage(attacker, target);
      const finalDamage = checkCritical(baseDamage);

      if (finalDamage > baseDamage) logMessage(`CRÍTICO!`, "text-warning");

      target.stats.current_hp -= finalDamage;
      logMessage(
        `${attacker.name} atacou ${target.name} e causou ${finalDamage} de dano!`,
        "text-danger",
      );

      if (target.stats.current_hp <= 0) {
        target.justDied = true;
        logMessage(`${target.name} caiu em combate!`, "text-danger fw-bold");
      } else {
        target.justTookDamage = true;
      }
    }

    updateUI();

    if (!checkBattleEnd()) {
      saveMidBattle();
      clearTimeout(turnTimer);
      turnTimer = setTimeout(() => {
        processNextTurn();
      }, 1500);
    }
  }, 300);
}

// ==========================================
// 9. RECOMPENSAS, DROPS E PROGRESSÃO
// ==========================================
function giveReward() {
  const currentMap = database.maps.find((m) => m.id === gameState.currentMapId);
  const currentDungeon = currentMap.dungeons[gameState.currentDungeonIndex];

  const goldReward = Math.floor(
    30 * gameState.currentRoom * currentDungeon.diff,
  );
  const expReward = Math.floor(
    (15 + 5 * gameState.currentRoom) * currentDungeon.diff,
  );

  myGroup.gold += goldReward;
  let expMessage = `O grupo encontrou ${goldReward} ouro!<br> O grupo ganhou ${expReward} EXP!`;

  gameState.sessionRewards.gold += goldReward;
  gameState.sessionRewards.exp += expReward;

  // COLETAR DROPS
  const isMiniBossRoom = gameState.currentRoom === 5;
  const isBossRoom = gameState.currentRoom === 10;

  gameState.enemiesLive.forEach((enemy) => {
    if (enemy.rewards && enemy.rewards.drops) {
      enemy.rewards.drops.forEach((drop) => {
        // Se for boss, drop raro (chance menor que 20%) é 100% garantido!
        let finalChance = drop.chance;
        if ((isMiniBossRoom || isBossRoom) && drop.chance <= 0.2) {
          finalChance = 1.0; // 100% de chance!
        }

        if (Math.random() <= finalChance) {
          // Salva no INVENTÁRIO DO GRUPO
          const itemInBag = playerInventory.find(
            (i) => i.item_id === drop.item_id,
          );
          if (itemInBag) {
            itemInBag.quantity += 1;
          } else {
            playerInventory.push({ item_id: drop.item_id, quantity: 1 });
          }

          const itemReal = database.items.find((i) => i.id === drop.item_id);
          const itemName = itemReal ? itemReal.name : `Item ID ${drop.item_id}`;
          const rarityColor =
            finalChance === 1.0 ? "text-warning" : "text-info"; // Destaca o drop do chefe

          expMessage += `<br>Drop: O grupo guardou 1x <span class="${rarityColor} fw-bold">${itemName}</span>!`;
          gameState.sessionRewards.drops.push(itemName);
        }
      });
    }
  });

  // SISTEMA DE EXPERIÊNCIA E LEVEL UP
  const aliveHeroes = myGroup.members.filter((h) => h.stats.current_hp > 0);

  aliveHeroes.forEach((hero) => {
    if (!hero.exp) hero.exp = { current: 0, max: 100 };
    if (!hero.growth) hero.growth = { hp: 15, attack: 2, defense: 2, speed: 1 };

    hero.exp.current += expReward;

    let leveledUpThisRoom = false;
    let oldLevel = hero.level || 1; // Guarda o nível que ele estava antes de upar

    // === while para processar todo o EXP acumulado! ===
    while (hero.exp.current >= hero.exp.max) {
      hero.level = (hero.level || 1) + 1;
      hero.exp.current -= hero.exp.max;
      hero.exp.max = Math.floor(hero.exp.max * 1.5);

      // ATUALIZAÇÃO DOS STATUS
      hero.stats.max_hp += hero.growth.hp;
      hero.stats.current_hp += hero.growth.hp;
      hero.stats.base_attack += hero.growth.attack;
      hero.stats.base_defense += hero.growth.defense;
      hero.stats.speed += hero.growth.speed;

      leveledUpThisRoom = true;

      // Guarda a evolução pra Tela Final (se ele upar 3x, guarda as 3x!)
      gameState.sessionRewards.levelUps.push({
        name: hero.name,
        level: hero.level,
        hpInc: hero.growth.hp,
        atkInc: hero.growth.attack,
        defInc: hero.growth.defense,
      });
    }

    if (leveledUpThisRoom) {
      expMessage += `<br>⬆️ <span class="text-info">${hero.name}</span> alcançou o Nível ${hero.level}!`;
      hero.justLeveledUp = true;
      hero.oldLevelForAnim = oldLevel;
    }
  });

  const p = document.createElement("p");
  p.className = `m-0 text-warning fw-bold mb-2`;
  p.innerHTML = expMessage;
  battleLog.appendChild(p);
  battleLog.scrollTop = battleLog.scrollHeight;

  updateUI();
}

function checkBattleEnd() {
  const aliveHeroes = myGroup.members.filter((h) => h.stats.current_hp > 0);
  const aliveEnemies = gameState.enemiesLive.filter(
    (e) => e.stats.current_hp > 0,
  );

  // GAME OVER
  if (aliveHeroes.length === 0) {
    // 1. APAGA O SAVE IMEDIATAMENTE!
    clearMidBattle();

    logMessage(
      `GAME OVER! O seu grupo foi aniquilado na Sala ${gameState.currentRoom}...`,
      "text-danger fw-bold",
    );
    btnAttack.disabled = true;
    btnSkill.disabled = true;
    btnPotion.disabled = true;

    // Aguarda 1.5s para o jogador ver a derrota e chama a tela
    setTimeout(() => {
      showGameOverScreen();
    }, 1500);

    return true;
  }

  // SALA LIMPA
  if (aliveEnemies.length === 0) {
    logMessage(`SALA ${gameState.currentRoom} LIMPA!`, "text-success fw-bold");
    giveReward();

    // VITÓRIA NA DUNGEON
    if (gameState.currentRoom >= gameState.maxRooms) {
      logMessage(
        `DUNGEON CONCLUÍDA! Você venceu o mapa!`,
        "text-warning fw-bold text-uppercase",
      );
      btnAttack.disabled = true;
      btnSkill.disabled = true;
      btnPotion.disabled = true;

      clearMidBattle();
      // Libera o próximo mapa
      myGroup.dungeonsCleared++;

      // Salvamento de mapa e heróis
      // Salva o Ouro e o Progresso de Mapas
      fetch("http://localhost:3000/api/save-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser,
          slotIndex: currentSlotIndex,
          dungeonsCleared: myGroup.dungeonsCleared,
          gold: myGroup.gold,
          inventory: playerInventory,
        }),
      })
        .then((res) => res.json())
        .then((data) => console.log("Progresso salvo: ", data.message))
        .catch((err) => console.error("Erro ao salvar progresso:", err));

      // Cura a equipe para a próxima aventura
      playerRoster.forEach((hero) => {
        hero.stats.current_hp = hero.stats.max_hp;
      });

      // Salva a Equipe (EXP, Níveis, Status e Itens no Inventário)
      fetch("http://localhost:3000/api/save-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser,
          slotIndex: currentSlotIndex,
          team: { roster: playerRoster, activeIds: activeTeamIds }
        }),
      })
        .then((res) => res.json())
        .then((data) => console.log("Time salvo: ", data.message))
        .catch((err) => console.error("Erro ao salvar time:", err));

      setTimeout(() => {
        showDungeonSummary();
      }, 2000);

      // AVANÇAR PARA A PRÓXIMA SALA
    } else {
      gameState.currentRoom++;
      logMessage(
        `Avançando para a Sala ${gameState.currentRoom}...`,
        "text-info",
      );
      gameState.selectedTarget = null;

      clearTimeout(turnTimer);
      turnTimer = setTimeout(() => {
        startRoom();
      }, 2500);
    }
    return true;
  }
  return false;
}

// ==========================================
// 10. HABILIDADES E ITENS
// ==========================================
btnPotion.addEventListener("click", () => {
  const hero = gameState.activeCharacter;

  const potion = playerInventory.find((item) => item.item_id === 1);

  if (!potion || potion.quantity <= 0) {
    logMessage(`O grupo não tem Poções de Vida na mochila!`, "text-warning");
    return;
  }

  btnAttack.disabled = true;
  btnSkill.disabled = true;
  btnPotion.disabled = true;

  potion.quantity -= 1;
  const itemData = database.items.find((i) => i.id === 1);
  const healAmount = itemData ? itemData.value : 50;

  hero.stats.current_hp = Math.min(
    hero.stats.current_hp + healAmount,
    hero.stats.max_hp,
  );

  logMessage(
    `${hero.name} bebeu uma Poção! Restam: ${potion.quantity}`,
    "text-success fw-bold",
  );
  hero.justHealed = true;

  updateUI();
  saveMidBattle();

  clearTimeout(turnTimer);
  turnTimer = setTimeout(() => {
    processNextTurn();
  }, 1200);
});

btnSkill.addEventListener("click", () => {
  const hero = gameState.activeCharacter;
  btnAttack.disabled = true;
  btnSkill.disabled = true;
  btnPotion.disabled = true;

  const heroCard = document.getElementById(`card-${hero.id}`);
  if (heroCard) heroCard.classList.add("anim-skill-use");

  setTimeout(() => {
    if (hero.role === "Tanque") {
      hero.stats.base_defense += 5;
      logMessage(
        `${hero.name} usou FORTIFICAR! Sua defesa aumentou drasticamente!`,
        "text-info fw-bold",
      );
    } else if (hero.role === "Suporte" || hero.role === "Curandeiro") {
      logMessage(
        `${hero.name} usou LUZ DIVINA! Todo o grupo foi curado!`,
        "text-success fw-bold",
      );
      const aliveHeroes = myGroup.members.filter((h) => h.stats.current_hp > 0);
      aliveHeroes.forEach((h) => {
        h.stats.current_hp = Math.min(h.stats.current_hp + 30, h.stats.max_hp);
        h.justHealed = true;
      });
    } else {
      logMessage(
        `${hero.name} invocou uma TEMPESTADE! (Dano em Área)`,
        "text-warning fw-bold",
      );
      const aliveEnemies = gameState.enemiesLive.filter(
        (e) => e.stats.current_hp > 0,
      );
      aliveEnemies.forEach((enemy) => {
        let baseDamage = calculateDamage(hero, enemy);
        let areaDamage = Math.max(Math.floor(baseDamage * 0.7), 1);
        enemy.stats.current_hp -= areaDamage;
        logMessage(`⚔️ ${enemy.name} sofreu ${areaDamage} de dano mágico!`);

        if (enemy.stats.current_hp <= 0) {
          enemy.justDied = true;
          if (
            gameState.selectedTarget &&
            gameState.selectedTarget.battleId === enemy.battleId
          ) {
            gameState.selectedTarget = null;
          }
        } else {
          enemy.justTookDamage = true;
        }
      });
    }

    updateUI();

    if (!checkBattleEnd()) {
      saveMidBattle();
      clearTimeout(turnTimer);
      turnTimer = setTimeout(() => {
        processNextTurn();
      }, 2000);
    }
  }, 600);
});

// ==========================================
// 11. SISTEMA DE UI GACHA
// ==========================================
function getStarsHTML(starCount) {
  if (!starCount) starCount = 1;

  let html = '<div class="star-container">';

  const starClass = starCount >= 5 ? "star-chromatic" : "star-shiny";

  for (let i = 0; i < starCount; i++) {
    html += `<span class="${starClass}">★</span>`;
  }

  html += "</div>";
  return html;
}

// ==========================================
// 12. SISTEMA DE MODAIS
// ==========================================
const modalHero = document.getElementById("modal-hero");
const modalHeroContent = document.getElementById("modal-hero-content");
document.getElementById("btn-close-hero").addEventListener("click", () => {
  modalHero.classList.add("d-none");
});

function showHeroDetails(hero) {
  // Garante que o herói tem equipamentos
  if (!hero.equipment) hero.equipment = { weapon: null, armor: null };

  modalHero.classList.remove("d-none");

  // Busca os dados do equipamento atual no database
  const weapon = hero.equipment.weapon
    ? database.items.find((i) => i.id === hero.equipment.weapon)
    : null;
  const armor = hero.equipment.armor
    ? database.items.find((i) => i.id === hero.equipment.armor)
    : null;

  modalHeroContent.innerHTML = `
    <h3 class="text-info text-center">${hero.name}</h3>
    <div class="text-center text-warning mb-2">${getStarsHTML(hero.stars)}</div>
    <div class="text-center mb-3"><span class="badge bg-secondary">Nível ${hero.level || 1}</span></div>
    
    <h5 class="text-light border-bottom border-secondary pb-1">Atributos</h5>
    <ul class="list-unstyled">
      <li>Vida: ${Math.max(0, hero.stats.current_hp)} / ${hero.stats.max_hp}</li>
      <li>Ataque: ${hero.stats.base_attack}</li>
      <li>Defesa: ${hero.stats.base_defense}</li>
      <li>Velocidade: ${hero.stats.speed}</li>
    </ul>

    <h5 class="text-light border-bottom border-secondary pb-1 mt-3">Equipamentos</h5>
    <div class="d-grid gap-2 mb-3">
      <button class="btn btn-outline-light d-flex justify-content-between align-items-center" onclick="openEquipSelect('${hero.id}', 'weapon')">
        <span>Arma: <strong class="text-info">${weapon ? weapon.name : "Nenhuma"}</strong></span>
        <span class="badge bg-primary">Trocar</span>
      </button>
      <button class="btn btn-outline-light d-flex justify-content-between align-items-center" onclick="openEquipSelect('${hero.id}', 'armor')">
        <span>Armadura: <strong class="text-info">${armor ? armor.name : "Nenhuma"}</strong></span>
        <span class="badge bg-primary">Trocar</span>
      </button>
    </div>
    
    <div class="progress mt-3 bg-dark border border-secondary" style="height: 10px;">
      <div class="progress-bar bg-info" style="width: ${(hero.exp.current / hero.exp.max) * 100}%"></div>
    </div>
    <div class="text-center text-secondary" style="font-size:0.7rem;">EXP: ${hero.exp.current} / ${hero.exp.max}</div>
  `;
}

const modalSummary = document.getElementById("modal-summary");
const modalSummaryContent = document.getElementById("modal-summary-content");
document.getElementById("btn-finish-dungeon").addEventListener("click", () => {
  modalSummary.classList.add("d-none");
  renderHome();
  showScreen("screen-home");
});

function showDungeonSummary() {
  modalSummary.classList.remove("d-none");
  const sr = gameState.sessionRewards;

  // AGRUPAR ITENS REPETIDOS
  const dropCounts = {};
  sr.drops.forEach((item) => {
    // Se o item já existe na lista, soma 1. Se não, começa com 1.
    dropCounts[item] = (dropCounts[item] || 0) + 1;
  });

  const dropKeys = Object.keys(dropCounts);
  let dropsHtml =
    dropKeys.length > 0
      ? dropKeys
        .map(
          (item) =>
            `<li><span class="text-warning fw-bold">${dropCounts[item]}x</span> <span class="text-info">${item}</span></li>`,
        )
        .join("")
      : "<li class='text-secondary'>Nenhum item encontrado.</li>";

  // AGRUPAR STATUS DE LEVEL UP
  const groupedLevels = {};
  sr.levelUps.forEach((l) => {
    if (!groupedLevels[l.name]) {
      // Primeira vez que o herói upou na dungeon
      groupedLevels[l.name] = {
        startLevel: l.level - 1,
        endLevel: l.level,
        hpInc: l.hpInc,
        atkInc: l.atkInc,
        defInc: l.defInc,
      };
    } else {
      // Se ele já upou antes, só atualiza o level final e SOMA os status ganhos
      groupedLevels[l.name].endLevel = l.level;
      groupedLevels[l.name].hpInc += l.hpInc;
      groupedLevels[l.name].atkInc += l.atkInc;
      groupedLevels[l.name].defInc += l.defInc;
    }
  });

  const levelKeys = Object.keys(groupedLevels);
  let levelUpsHtml =
    levelKeys.length > 0
      ? levelKeys
        .map((name) => {
          const data = groupedLevels[name];
          return `
          <div class="mb-2 p-2 border border-success rounded bg-dark">
            <strong class="text-success">⬆️ ${name} evoluiu do Nível ${data.startLevel} > ${data.endLevel}!</strong><br>
            <small class="text-light">+ ${data.hpInc} HP | + ${data.atkInc} ATQ | + ${data.defInc} DEF</small>
          </div>
        `;
        })
        .join("")
      : "<p class='text-secondary'>Ninguém subiu de nível desta vez.</p>";

  modalSummaryContent.innerHTML = `
    <div class="row text-center mb-4">
      <div class="col-6"><h4 class="text-warning">+${sr.gold}</h4><small>Ouro</small></div>
      <div class="col-6"><h4 class="text-info">+${sr.exp}</h4><small>EXP (Por Herói)</small></div>
    </div>
    <h5 class="text-light border-bottom border-secondary pb-1">Tesouros Coletados</h5>
    <ul class="list-unstyled mb-4">${dropsHtml}</ul>
    <h5 class="text-light border-bottom border-secondary pb-1">Evolução da Equipe</h5>
    ${levelUpsHtml}
  `;
}

// ==========================================
// BOTÃO DE FUGIR DA BATALHA
// ==========================================
btnFlee.addEventListener("click", () => {
  const confirmFlee = confirm(
    "Tem certeza que deseja sair? Você perderá o progresso desta tentativa (mas manterá a XP que já ganhou).",
  );

  if (confirmFlee) {
    // para o turno e a i.a do mob
    clearTimeout(turnTimer);
    // apaga o save
    clearMidBattle();
    renderHome();
    showScreen("screen-home");
    console.log("O Jogador saiu da batalha");
  }
});

// ==========================================
// 12. INVENTÁRIO
// ==========================================

// Fechar Inventario
btnCloseInventory.addEventListener("click", () => {
  modalInventory.classList.add("d-none");
});

// Abrir inventario e desenhar itens
document.getElementById("nav-btn-inventory").addEventListener("click", () => {
  modalInventory.classList.remove("d-none");
  inventoryContent.innerHTML = "";

  if (playerInventory.length === 0) {
    inventoryContent.innerHTML = `<p class="text-center text-secondary w-100 mt-4">Sua mochila está vazia!</p>`;
    return;
  }

  playerInventory.forEach((bagItem) => {
    // Busca os poderes do item
    const itemData = database.items.find((i) => i.id === bagItem.item_id);
    if (!itemData) return;

    // Cor da borda por raridade
    let rarityBorder = "border-secondary";
    let rarityText = "text-light";
    if (itemData.rarity === "incomum") {
      rarityBorder = "border-success";
      rarityText = "text-success";
    }
    if (itemData.rarity === "raro") {
      rarityBorder = "border-info";
      rarityText = "text-info";
    }
    if (itemData.rarity === "épico") {
      rarityBorder = "border-primary";
      rarityText = "text-primary";
    }
    if (itemData.rarity === "lendário") {
      rarityBorder = "border-warning";
      rarityText = "text-warning";
    }

    // Define o ícone pelo tipo
    let icon = "<i class='bi bi-box'></i>";
    if (itemData.type === "weapon") icon = "<i class='bi bi-sword'></i>";
    if (itemData.type === "armor") icon = "<i class='bi bi-shield'></i>";
    if (itemData.type === "consumable") icon = "<i class='bi bi-bandaid'></i>";

    const col = document.createElement("div");
    col.className = "col-md-6"; // Dois itens por linha no pc e um no celular

    col.innerHTML = `
    <div class="card bg-dark p-2 h-100 ${rarityBorder}" style="border-width: 2px;">
        <div class="d-flex justify-content-between align-items-start">
          <strong class="${rarityText}">${icon} ${itemData.name}</strong>
          <span class="badge bg-secondary fs-6">x${bagItem.quantity}</span>
        </div>
        <small class="text-secondary d-block mb-1 text-capitalize">${itemData.type} • ${itemData.rarity}</small>
        <p class="mb-0 text-light" style="font-size: 0.85rem;">${itemData.description}</p>
        ${itemData.allowedClasses ? `<small class="text-warning d-block mt-1" style="font-size: 0.75rem;">Restrição: ${itemData.allowedClasses.join(", ")}</small>` : ""}
      </div>
    `;

    inventoryContent.appendChild(col);
  });
});

// ==========================================
// 13. SISTEMA DE EQUIPAMENTOS
// ==========================================
// Função para salvar imediatamente as trocas de equipamento
function saveEquipState() {
  fetch("http://localhost:3000/api/save-progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: currentUser, slotIndex: currentSlotIndex, dungeonsCleared: myGroup.dungeonsCleared, gold: myGroup.gold, inventory: playerInventory })
  });
  fetch("http://localhost:3000/api/save-team", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: currentUser, slotIndex: currentSlotIndex, team: { roster: playerRoster, activeIds: activeTeamIds } })
  });
}

// Abre a lista de itens compativeis
window.openEquipSelect = function (heroId, type) {
  const hero = playerRoster.find((h) => h.id === heroId);

  // Filtra o inventario
  const availableItems = playerInventory.filter((bagItem) => {
    const itemData = database.items.find((i) => i.id === bagItem.item_id);
    if (!itemData || itemData.type !== type) return false;

    // Verifica retrição de classe
    if (
      itemData.allowedClasses.includes("Todas") ||
      itemData.allowedClasses.includes(hero.role)
    ) {
      return true;
    }
    return false;
  });

  // Cria lista de botões
  let listHtml = availableItems
    .map((bagItem) => {
      const itemData = database.items.find((i) => i.id === bagItem.item_id);
      let statsStr = "";
      if (itemData.stats.attack) statsStr += `+${itemData.stats.attack} ATQ | `;
      if (itemData.stats.defense)
        statsStr += `+${itemData.stats.defense} DEF | `;
      if (itemData.stats.max_hp) statsStr += `+${itemData.stats.max_hp} HP | `;
      if (itemData.stats.speed) statsStr += `+${itemData.stats.speed} VEL`;

      return `
    <button class="btn btn-dark border-secondary w-100 text-start mb-2" onclick="equipItem('${hero.id}', '${type}', ${itemData.id})">
        <strong class="text-info">${itemData.name}</strong> <span class="badge bg-secondary">x${bagItem.quantity}</span><br>
        <small class="text-success">${statsStr}</small>
      </button>
    `;
    })
    .join("");

  if (availableItems.length === 0)
    listHtml = `<p class="text-center text-secondary mt-3">Nenhum equipamento compatível na mochila.</p>`;

  const unequipBtn = hero.equipment[type]
    ? `<button class="btn btn-danger w-100 mb-3 fw-bold" onclick="unequipItem('${hero.id}', '${type}')">Remover Equipamento Atual</button>`
    : "";

  modalHeroContent.innerHTML = `
    <h4 class="text-warning text-center mb-3">Escolher ${type === "weapon" ? "Arma 🗡️" : "Armadura 🛡️"}</h4>
    ${unequipBtn}
    <div style="max-height: 40vh; overflow-y: auto; padding-right: 5px;">
      ${listHtml}
    </div>
    <button class="btn btn-secondary w-100 mt-3" onclick="showHeroDetailsById('${hero.id}')">Voltar</button>
  `;
};

// Retorna para tela principal do heroi
window.showHeroDetailsById = function (heroId) {
  const hero = playerRoster.find((h) => h.id === heroId);
  showHeroDetails(hero);
};

// Logica de vestir armadura
window.equipItem = function (heroId, type, itemId) {
  const hero = playerRoster.find((h) => h.id === heroId);

  // Se ja tem algo equipado, devolve pra mochila
  if (hero.equipment[type]) unequipItem(heroId, type, false);

  // Remove o novo item da mochila
  const bagIndex = playerInventory.findIndex((i) => i.item_id === itemId);
  if (bagIndex === -1) return;
  playerInventory[bagIndex].quantity -= 1;
  if (playerInventory[bagIndex].quantity <= 0)
    playerInventory.splice(bagIndex, 1);

  // Equipa no heroi
  hero.equipment[type] = itemId;

  // Soma os atributos permanentes
  const itemData = database.items.find((i) => i.id === itemId);
  if (itemData.stats.attack) hero.stats.base_attack += itemData.stats.attack;
  if (itemData.stats.defense) hero.stats.base_defense += itemData.stats.defense;
  if (itemData.stats.speed) hero.stats.speed += itemData.stats.speed;
  if (itemData.stats.max_hp) {
    hero.stats.max_hp += itemData.stats.max_hp;
    hero.stats.current_hp += itemData.stats.max_hp;
  }

  // Atualiza a tela
  updateUI();
  showHeroDetails(hero);
  saveEquipState();
};

// Logica de tirar armadura
window.unequipItem = function (heroId, type, render = true) {
  const hero = playerRoster.find((h) => h.id === heroId);
  if (!hero.equipment[type]) return;

  const itemId = hero.equipment[type];
  const itemData = database.items.find((i) => i.id === itemId);
  // Devolve pra mochila
  const bagItem = playerInventory.find((i) => i.item_id === itemId);
  if (bagItem) bagItem.quantity += 1;
  else playerInventory.push({ item_id: itemId, quantity: 1 });

  // Subtrai os atributos do heroi
  if (itemData.stats.attack) hero.stats.base_attack -= itemData.stats.attack;
  if (itemData.stats.defense) hero.stats.base_defense -= itemData.stats.defense;
  if (itemData.stats.speed) hero.stats.speed -= itemData.stats.speed;
  if (itemData.stats.max_hp) {
    hero.stats.max_hp -= itemData.stats.max_hp;
    hero.stats.current_hp = Math.min(hero.stats.current_hp, hero.stats.max_hp); // Ajusta a vida pra não bugar
  }

  // Esvazia o slot
  hero.equipment[type] = null;

  // Atualiza a tela
  if (render) {
    updateUI();
    showHeroDetails(hero);
  }
  saveEquipState();
};

// ==========================================
// GAME OVER (PERDAS E GANHOS)
// ==========================================
function showGameOverScreen() {
  modalGameOver.classList.remove("d-none");

  const lostItems = [];

  // vasculha itens ganhos na dungeon
  gameState.sessionRewards.drops.forEach((itemName) => {
    const itemData = database.items.find((i) => i.name === itemName);

    // Se nao foir consumivel nao remove
    if (itemData && itemData.type !== "consumable") {
      lostItems.push(itemName);

      // Remove da mochila
      const bagIndex = playerInventory.findIndex(
        (bag) => bag.item_id === itemData.id,
      );
      if (bagIndex !== -1) {
        playerInventory[bagIndex].quantity -= 1;
        if (playerInventory[bagIndex].quantity <= 0) {
          playerInventory.splice(bagIndex, 1);
        }
      }
    }
  });

  // conta os itens perdidos e mostra na tela
  const dropCounts = {};
  lostItems.forEach((item) => {
    dropCounts[item] = (dropCounts[item] || 0) + 1;
  });
  const lostKeys = Object.keys(dropCounts);

  let lostHtml =
    lostKeys.length > 0
      ? lostKeys
        .map(
          (item) =>
            `<li><span class="text-danger fw-bold">-${dropCounts[item]}x</span> <span class="text-secondary text-decoration-line-through">${item}</span></li>`,
        )
        .join("")
      : "<li class='text-secondary'>Nenhum equipamento foi perdido.</li>";

  // Monta a interface
  modalGameOverContent.innerHTML = `
    <h5 class="text-success mb-2">O que você salvou:</h5>
    <ul class="list-unstyled mb-3 text-light">
      <li>+${gameState.sessionRewards.gold} Ouro</li>
      <li>+${gameState.sessionRewards.exp} EXP (Mantido nos Heróis)</li>
      <li>Poções dropadas foram mantidas.</li>
    </ul>
    
    <h5 class="text-danger border-top border-secondary pt-3 mb-2">❌ O que ficou para trás:</h5>
    <ul class="list-unstyled mb-0">
      ${lostHtml}
    </ul>
  `;

  // Salva a perda no banco de dados
  clearMidBattle();
  fetch("http://localhost:3000/api/save-progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: currentUser,
      slotIndex: currentSlotIndex,
      dungeonsCleared: myGroup.dungeonsCleared,
      gold: myGroup.gold,
      inventory: playerInventory, // Salva o inventario sem os itens perdidos
    }),
  });

  // Salva o EXP
  fetch("http://localhost:3000/api/save-team", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: currentUser, slotIndex: currentSlotIndex, team: { roster: playerRoster, activeIds: activeTeamIds } }),
  });
}

// Funcao para reviver os herois mortos
function healTeamForNextRun() {
  playerRoster.forEach((hero) => {
    hero.stats.current_hp = hero.stats.max_hp;
  });
}

// botao voltar ao mapa
btnReturnMap.addEventListener("click", () => {
  modalGameOver.classList.add("d-none");
  healTeamForNextRun();
  renderHome();
  showScreen("screen-home");
});

btnRetryDungeon.addEventListener("click", () => {
  modalGameOver.classList.add("d-none");
  healTeamForNextRun();
  gameState.currentRoom = 1;
  startRoom();
});

// ==========================================
// 14. SISTEMA DE LOJA E GACHA 
// ==========================================
const btnNavShop = document.getElementById("nav-btn-shop");
const btnOpenGacha = document.getElementById("btn-open-gacha");

const modalGacha = document.getElementById("modal-gacha");
const btnCloseGacha = document.getElementById("btn-close-gacha");
const btnRollGacha = document.getElementById("btn-roll-gacha");
const gachaResult = document.getElementById("gacha-result");
const gachaGoldDisplay = document.getElementById("gacha-gold-display");

// 1. Abre a Loja a partir da Home
if (btnNavShop) {
  btnNavShop.addEventListener("click", () => {
    showScreen("screen-shop");
    if (shopGoldCounter) shopGoldCounter.innerText = myGroup.gold;
  });
}

// 2. Abre o Modal do Gacha a partir da Loja
if (btnOpenGacha) {
  btnOpenGacha.addEventListener("click", () => {
    if (modalGacha) {
      modalGacha.classList.remove("d-none");
      if (gachaGoldDisplay) gachaGoldDisplay.innerText = myGroup.gold;
      if (gachaResult) gachaResult.classList.add("d-none");
      if (gachaResult) gachaResult.style.transform = "scale(0.8)";
    }
  });
}

// 3. Fecha o Gacha
if (btnCloseGacha) {
  btnCloseGacha.addEventListener("click", () => {
    modalGacha.classList.add("d-none");
    renderHome(); // Atualiza a Home para mostrar caso tenha vindo herói novo pro time
  });
}

// 4. Lógica de Rolar (Sortear Herói)
if (btnRollGacha) {
  btnRollGacha.addEventListener("click", () => {
    const GACHA_COST = 500;

    if (myGroup.gold < GACHA_COST) {
      alert("Ouro insuficiente! Vá explorar Dungeons para conseguir mais.");
      return;
    }

    // Gasta o Ouro e desativa botão pra não clicar 2x rápido
    myGroup.gold -= GACHA_COST;
    gachaGoldDisplay.innerText = myGroup.gold;
    btnRollGacha.disabled = true;
    gachaResult.classList.add("d-none");

    // Animação de suspense
    setTimeout(() => {
      // SORTEIO (RNG)
      const randomIndex = Math.floor(Math.random() * database.characters.length);
      const pulledHeroDb = database.characters[randomIndex];

      // Verifica se já temos ele na coleção
      const ownedHero = playerRoster.find(h => h.id === pulledHeroDb.id);
      let resultMessage = "";

      if (ownedHero) {
        // VEIO REPETIDO: Sobe 1 level e ganha status!
        ownedHero.level = (ownedHero.level || 1) + 1;
        const growth = ownedHero.growth || { hp: 15, attack: 2, defense: 2, speed: 1 };
        ownedHero.stats.max_hp += growth.hp;
        ownedHero.stats.current_hp += growth.hp;
        ownedHero.stats.base_attack += growth.attack;
        ownedHero.stats.base_defense += growth.defense;
        ownedHero.stats.speed += growth.speed;

        resultMessage = `<h4 class="text-info mt-2">DUPLICATA!</h4>
                         <p class="text-light mb-0">Seu ${ownedHero.name} subiu para o Nível ${ownedHero.level}!</p>`;
      } else {
        // NOVO HERÓI: Adiciona na Coleção!
        playerRoster.push(structuredClone(pulledHeroDb));
        resultMessage = `<h4 class="text-success mt-2">NOVO HERÓI DESBLOQUEADO!</h4>
                         <p class="text-light mb-0">Você agora pode equipá-lo na Taverna!</p>`;
      }

      // Salvar no Banco de Dados imediatamente
      fetch("http://localhost:3000/api/save-progress", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser, slotIndex: currentSlotIndex, dungeonsCleared: myGroup.dungeonsCleared, gold: myGroup.gold, inventory: playerInventory })
      });
      fetch("http://localhost:3000/api/save-team", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser, slotIndex: currentSlotIndex, team: { roster: playerRoster, activeIds: activeTeamIds } })
      });

      // Exibir na tela
      gachaResult.innerHTML = `
        <i class="bi bi-stars text-warning mb-2" style="font-size: 3rem;"></i>
        <h2 class="text-warning">${pulledHeroDb.name}</h2>
        <div class="mb-2">${getStarsHTML(pulledHeroDb.stars)}</div>
        <span class="badge bg-secondary mb-3">${pulledHeroDb.role}</span>
        <hr class="border-secondary">
        ${resultMessage}
      `;

      gachaResult.classList.remove("d-none");

      // Efeito de "Pulo" do card
      setTimeout(() => { gachaResult.style.transform = "scale(1)"; }, 50);

      btnRollGacha.disabled = false;
    }, 800); // 800ms de suspense
  });
}

// ==========================================
// BOTÃO DE CONFIRMAR O GACHA INICIAL
// ==========================================
document.getElementById("btn-confirm-initial").addEventListener("click", async () => {
  document.getElementById("modal-initial-gacha").classList.add("d-none");

  // Já salva esse time inicial no servidor para garantir que o slot deixe de ser "Vazio"
  try {
    await fetch("http://localhost:3000/api/save-team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: currentUser,
        slotIndex: currentSlotIndex,
        team: { roster: playerRoster, activeIds: activeTeamIds }
      }),
    });
  } catch (err) {
    console.error("Erro ao salvar time inicial:", err);
  }

  // Vai para a Base
  renderHome();
  showScreen("screen-home");
});