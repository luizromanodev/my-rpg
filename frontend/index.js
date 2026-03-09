import { database, loadDatabase } from "./data/database.js";

// ==========================================
// 1. ELEMENTOS DA INTERFACE (DOM)
// ==========================================
const btnAttack = document.getElementById("btn-attack");
const btnPotion = document.getElementById("btn-potion");
const btnSkill = document.getElementById("btn-skill");
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
const worldMapsContainer = document.getElementById("world-maps-container");
const mapGoldCounter = document.getElementById("map-gold-counter");

// ==========================================
// 2. ESTADO DO JOGO E SAVE
// ==========================================
let currentUser = null;
let myGroup = { name: "Grupo do Herói", gold: 0, members: [] };
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
      team: myGroup.members,
      dungeonState: stateToSave,
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
      team: myGroup.members,
      dungeonState: null,
    }),
  });
}

// ==========================================
// 3. GERENCIAMENTO DE TELAS E CONTAS
// ==========================================
function showScreen(screenId) {
  screenLogin.classList.add("d-none");
  screenTavern.classList.add("d-none");
  screenMap.classList.add("d-none");
  screenBattle.classList.add("d-none");
  document.getElementById(screenId).classList.remove("d-none");
}

async function handleAccount(action) {
  const username = inputUser.value.trim();
  const password = inputPass.value.trim();

  if (!username || !password) {
    loginMsg.innerText = "Preencha todos os campos.";
    loginMsg.className = "mt-3 mb-0 fw-bold text-danger";
    return;
  }

  loginMsg.innerText = "Carregando...";
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
      loginMsg.innerText = data.message;
      loginMsg.className = "mt-3 mb-0 fw-bold text-success";

      if (action === "login") {
        currentUser = username;
        myGroup.gold = data.saveData.gold;
        myGroup.dungeonsCleared = data.saveData.dungeonsCleared || 0;

        if (data.saveData.team && data.saveData.team.length === 3) {
          myGroup.members = data.saveData.team;

          if (data.saveData.dungeonState) {
            gameState.currentMapId = data.saveData.dungeonState.currentMapId;
            gameState.currentDungeonIndex =
              data.saveData.dungeonState.currentDungeonIndex;
            gameState.currentRoom = data.saveData.dungeonState.currentRoom;
            gameState.enemiesLive = data.saveData.dungeonState.enemiesLive;
            gameState.sessionRewards =
              data.saveData.dungeonState.sessionRewards;

            setTimeout(() => {
              showScreen("screen-battle");
              battleLog.innerHTML = "";
              logMessage(
                `Batalha Restaurada! Você voltou para a Sala ${gameState.currentRoom}.`,
                "text-info fw-bold",
              );
              buildTurnQueue();
              processNextTurn();
            }, 1000);
          } else {
            setTimeout(() => {
              renderMapScreen();
              showScreen("screen-map");
            }, 1000);
          }
        } else {
          renderTavern();
          setTimeout(() => showScreen("screen-tavern"), 1000);
        }
      }
    }
  } catch (err) {
    console.error("Erro real:", err);
    loginMsg.innerText = "Erro de conexão com o servidor.";
    loginMsg.className = "mt-3 mb-0 fw-bold text-danger";
  }
}

btnLogin.addEventListener("click", () => handleAccount("login"));
btnRegister.addEventListener("click", () => handleAccount("register"));

btnStartAdventure.addEventListener("click", async () => {
  if (myGroup.members.length !== 3) return;

  try {
    await fetch("http://localhost:3000/api/save-team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: currentUser, team: myGroup.members }),
    });
    console.log("Time salvo no servidor com sucesso!");
  } catch (err) {
    console.error("Erro ao salvar time:", err);
  }

  renderMapScreen();
  showScreen("screen-map");
});

// ==========================================
// 4. INICIALIZAÇÃO DO JOGO
// ==========================================
init();

async function init() {
  console.log("Baixando dados do servidor...");
  const dbLoaded = await loadDatabase();

  if (dbLoaded) {
    console.log("Banco de dados pronto! Aguardando jogador fazer login.");
  } else {
    loginMsg.innerText =
      "Erro ao carregar o banco de dados. O servidor está ligado?";
    loginMsg.className = "mt-3 mb-0 fw-bold text-danger";
  }
}

// ==========================================
// 5. SELEÇÃO DE EQUIPE (TAVERNA)
// ==========================================
function renderTavern() {
  rosterContainer.innerHTML = "";
  myGroup.members = [];

  btnStartAdventure.disabled = true;
  btnStartAdventure.innerText = `Selecione 3 Heróis (0/3)`;
  btnStartAdventure.className = "btn btn-secondary btn-lg fw-bold shadow mt-3";

  database.characters.forEach((char) => {
    const col = document.createElement("div");
    col.className = "col-md-3 mb-3";

    const card = document.createElement("div");
    card.className = "card p-3 h-100 text-start border-secondary";
    card.style.cursor = "pointer";
    card.style.transition = "transform 0.2s, border-color 0.2s";

    // Adicionado as estrelas e nível na Taverna!
    card.innerHTML = `
      <h4 class="text-warning text-center mb-0">${char.name}</h4>
      <div class="text-center mb-1 d-flex justify-content-center align-items-center gap-2">
        ${getStarsHTML(char.stars)} 
        <span class="text-light" style="font-size: 0.8rem;">Lv.${char.level || 1}</span>
      </div>
      <div class="text-center mb-2">
        <span class="badge bg-info text-dark">${char.role}</span>
      </div>
      <p style="font-size: 0.85rem; height: 40px;">${char.description}</p>
      <hr class="border-secondary mt-0">
      <ul class="list-unstyled mb-0 fw-bold" style="font-size: 0.85rem;">
        <li class="text-success">HP: ${char.stats.max_hp}</li>
        <li class="text-danger">ATQ: ${char.stats.base_attack}</li>
        <li class="text-primary">DEF: ${char.stats.base_defense}</li>
        <li class="text-warning">VEL: ${char.stats.speed}</li>
      </ul>
    `;

    card.addEventListener("click", () => {
      const isSelected = myGroup.members.some((m) => m.id === char.id);

      if (isSelected) {
        myGroup.members = myGroup.members.filter((m) => m.id !== char.id);
        card.classList.remove("border-warning", "shadow-lg");
        card.classList.add("border-secondary");
        card.style.transform = "scale(1)";
      } else {
        if (myGroup.members.length < 3) {
          myGroup.members.push(structuredClone(char));
          card.classList.remove("border-secondary");
          card.classList.add("border-warning", "shadow-lg");
          card.style.transform = "scale(1.05)";
        } else {
          alert("Você só pode selecionar 3 heróis para a aventura!");
          return;
        }
      }

      const count = myGroup.members.length;
      if (count === 3) {
        btnStartAdventure.disabled = false;
        btnStartAdventure.innerText = `Ir para a Arena`;
        btnStartAdventure.className =
          "btn btn-warning btn-lg fw-bold shadow mt-3";
      } else {
        btnStartAdventure.disabled = true;
        btnStartAdventure.innerText = `Selecione 3 Heróis (${count}/3)`;
        btnStartAdventure.className =
          "btn btn-secondary btn-lg fw-bold shadow mt-3";
      }
    });

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
    if (hero.justLeveledUp) {
      extraClass = "anim-level-up";
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
      <div class="d-flex justify-content-between align-items-center">
        <strong class="${isDead ? "text-decoration-line-through text-secondary" : "text-info"}">
          ${hero.name} <span class="text-light fs-6 opacity-75">Lv.${hero.level || 1}</span>
        </strong>
        <span class="badge bg-secondary">${hero.role}</span>
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

  if (gameState.currentRoom === 1) {
    // Sala 1: Ninguém tem turno ainda, calcula do zero
    buildTurnQueue();
  } else {
    // Salas Seguintes: Remove os mortos da fila atual
    gameState.turnQueue = gameState.turnQueue.filter(
      (c) => c.stats.current_hp > 0,
    );
    // Adiciona os monstros recém-nascidos na fila
    gameState.turnQueue.push(...gameState.enemiesLive);
    // Reordena a fila pela velocidade
    gameState.turnQueue.sort((a, b) => b.stats.speed - a.stats.speed);
  }

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
  gameState.enemiesLive.forEach((enemy) => {
    if (enemy.rewards && enemy.rewards.drops) {
      enemy.rewards.drops.forEach((drop) => {
        if (Math.random() <= drop.chance) {
          const luckyHero = myGroup.members.find((h) => h.stats.current_hp > 0);
          if (luckyHero) {
            if (!luckyHero.inventory) luckyHero.inventory = [];

            const itemInBag = luckyHero.inventory.find(
              (i) => i.item_id === drop.item_id,
            );
            if (itemInBag) itemInBag.quantity += 1;
            else
              luckyHero.inventory.push({ item_id: drop.item_id, quantity: 1 });

            const itemReal = database.items.find((i) => i.id === drop.item_id);
            const itemName = itemReal
              ? itemReal.name
              : `Item ID ${drop.item_id}`;

            expMessage += `<br>Drop: O grupo recolheu 1x <span class="text-info">${itemName}</span>!`;
            gameState.sessionRewards.drops.push(itemName);
          }
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

    if (hero.exp.current >= hero.exp.max) {
      hero.level = (hero.level || 1) + 1;
      hero.exp.current -= hero.exp.max;
      hero.exp.max = Math.floor(hero.exp.max * 1.5);

      // ATUALIZAÇÃO DOS STATUS
      hero.stats.max_hp += hero.growth.hp;
      // Adiciona apenas a vida do crescimento na vida atual
      hero.stats.current_hp += hero.growth.hp;

      hero.stats.base_attack += hero.growth.attack;
      hero.stats.base_defense += hero.growth.defense;
      hero.stats.speed += hero.growth.speed;

      expMessage += `<br>⬆️ <span class="text-info">${hero.name}</span> subiu para o Nível ${hero.level}!`;

      hero.justLeveledUp = true;

      gameState.sessionRewards.levelUps.push({
        name: hero.name,
        level: hero.level,
        hpInc: hero.growth.hp,
        atkInc: hero.growth.attack,
        defInc: hero.growth.defense,
      });
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
    clearMidBattle();
    logMessage(
      `GAME OVER! Seu grupo foi aniquilado na Sala ${gameState.currentRoom}...`,
      "text-danger fw-bold",
    );
    btnAttack.disabled = true;
    btnSkill.disabled = true;
    btnPotion.disabled = true;
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
          dungeonsCleared: myGroup.dungeonsCleared,
          gold: myGroup.gold,
        }),
      })
        .then((res) => res.json())
        .then((data) => console.log("Progresso salvo: ", data.message))
        .catch((err) => console.error("Erro ao salvar progresso:", err));

      // Cura a equipe para a próxima aventura
      myGroup.members.forEach((hero) => {
        hero.stats.current_hp = hero.stats.max_hp;
      });

      // Salva a Equipe (EXP, Níveis, Status e Itens no Inventário)
      fetch("http://localhost:3000/api/save-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser,
          team: myGroup.members,
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

  if (!hero.inventory) hero.inventory = [];
  const potion = hero.inventory.find((item) => item.item_id === 1);

  if (!potion || potion.quantity <= 0) {
    logMessage(
      ` ${hero.name} não tem Poções de Vida no inventário!`,
      "text-warning",
    );
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
  modalHero.classList.remove("d-none");

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

    <h5 class="text-light border-bottom border-secondary pb-1 mt-3">Equipamentos (Em Breve)</h5>
    <ul class="list-unstyled text-secondary">
      <li>Arma: Nenhuma</li>
      <li>Armadura: Nenhuma</li>
    </ul>
    
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
  showScreen("screen-map");
  renderMapScreen();
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
