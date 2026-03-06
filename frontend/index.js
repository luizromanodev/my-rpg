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
};

let turnTimer = null;

const campaignMaps = [
  {
    id: "map_1",
    name: "Caverna dos Goblins",
    requiredClears: 0,
    mobsNormal: ["Slime Verde", "Morcego Gigante", "Goblin Menor"],
    mobsElite: ["Goblin Guerreiro", "Lobo Atroz"],
    miniBoss: ["Xamã Goblin"],
    boss: ["Rei Goblin"],
  },
  {
    id: "map_2",
    name: "Cidade Soterrada",
    requiredClears: 1,
    mobsNormal: ["Esqueleto Raso", "Rato Zumbi", "Ladrão de Tumbas"],
    mobsElite: ["Cavaleiro Caído", "Aparição Sombria"],
    miniBoss: ["Necromante Aprendiz"],
    boss: ["Lorde Esqueleto"],
  },
  {
    id: "map_3",
    name: "Pico Congelado",
    requiredClears: 2,
    mobsNormal: ["Lobo do Gelo", "Elemental de Neve", "Yeti Jovem"],
    mobsElite: ["Golem de Gelo", "Bruxa da Nevasca"],
    miniBoss: ["Dragão Branco Filhote"],
    boss: ["Rei do Inverno"],
  },
];

myGroup.dungeonsCleared = 0;

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

        // Carrega o progresso dos mapas salvos no banco
        myGroup.dungeonsCleared = data.saveData.dungeonsCleared || 0;

        if (data.saveData.team && data.saveData.team.length === 3) {
          myGroup.members = data.saveData.team;

          // Vai para o Mapa Mundi! (Sem chamar updateUI() ou startRoom() aqui)
          setTimeout(() => {
            renderMapScreen();
            showScreen("screen-map");
          }, 1000);
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

// Configura e inicia a batalha a partir da Taverna
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

    card.innerHTML = `
      <h4 class="text-warning text-center mb-1">${char.name}</h4>
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

  campaignMaps.forEach((map) => {
    const isUnlocked = myGroup.dungeonsCleared >= map.requiredClears;
    const col = document.createElement("div");
    col.className = "col-md-8 mb-3";

    const card = document.createElement("div");
    card.className = `card p-3 border-2 ${isUnlocked ? "border-info bg-dark" : "border-secondary bg-secondary opacity-75"}`;
    card.style.cursor = isUnlocked ? "pointer" : "not-allowed";

    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h4 class="${isUnlocked ? "text-warning" : "text-dark"} m-0">${isUnlocked ? "🗺️" : "🔒"} ${map.name}</h4>
          <small class="${isUnlocked ? "text-light" : "text-dark"}">10 Salas (Boss: ${map.boss[0]})</small>
        </div>
        <button class="btn ${isUnlocked ? "btn-primary" : "btn-secondary"} fw-bold" ${!isUnlocked ? "disabled" : ""}>
          ${isUnlocked ? "ENTRAR" : "BLOQUEADO"}
        </button>
      </div>
    `;

    if (isUnlocked) {
      card.addEventListener("click", () => {
        // Correção de bug double click
        if (
          !document.getElementById("screen-map").classList.contains("d-none")
        ) {
          gameState.currentMapId = map.id;
          gameState.currentRoom = 1;
          showScreen("screen-battle");
          startRoom();
        }
      });
    }

    col.appendChild(card);
    worldMapsContainer.appendChild(col);
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
    if (hero.justDied) {
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
        <strong class="${isDead ? "text-decoration-line-through text-secondary" : "text-info"}">${hero.name}</strong>
        <span class="badge bg-secondary">${hero.role}</span>
      </div>
      <p class="mt-1 mb-1">HP: ${Math.max(0, hero.stats.current_hp)} / ${hero.stats.max_hp}</p>
      <div class="progress">
        <div class="progress-bar ${isDead ? "bg-secondary" : "bg-success"}" style="width: ${Math.max(0, hpPercent)}%"></div>
      </div>
    `;
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

    // GERENCIADOR DE ANIMAÇÕES
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

  gameState.enemiesLive = [];
  gameState.turnQueue = [];
  gameState.activeCharacter = null;
  gameState.selectedTarget = null;

  const currentMap = campaignMaps.find((m) => m.id === gameState.currentMapId);
  const room = gameState.currentRoom;

  let enemyPool = [];
  let numEnemies = Math.floor(Math.random() * 3) + 1;

  // REGRAS DE SALA
  if (room >= 1 && room <= 3) {
    enemyPool = currentMap.mobsNormal;
  } else if (room === 4 || (room >= 6 && room <= 9)) {
    enemyPool = currentMap.mobsElite;
  } else if (room === 5) {
    enemyPool = currentMap.miniBoss;
    numEnemies = 1; // Mini Boss vem sozinho
  } else if (room === 10) {
    enemyPool = currentMap.boss;
    numEnemies = 1; // Boss Final vem sozinho
  }

  const letras = ["A", "B", "C"];

  for (let i = 0; i < numEnemies; i++) {
    const enemyName = enemyPool[Math.floor(Math.random() * enemyPool.length)];

    const enemyData = database.enemies.find((e) => e.name === enemyName);

    const newEnemy = structuredClone(enemyData || database.enemies[0]);

    newEnemy.battleId = `enemy_${i + 1}`;

    newEnemy.name = enemyData ? enemyName : `[Falta Criar] ${enemyName}`;

    if (numEnemies > 1) {
      newEnemy.name = `${newEnemy.name} ${letras[i]}`;
    }

    // Buff para aumento de dificuldade de mobs
    if (room === 4 || room >= 5) {
      newEnemy.stats.max_hp = Math.floor(newEnemy.stats.max_hp * 1.5);
      newEnemy.stats.current_hp = newEnemy.stats.max_hp;
      newEnemy.stats.base_attack += 3;
    }

    gameState.enemiesLive.push(newEnemy);
  }

  battleLog.innerHTML = "";
  logMessage(
    `🏰 Explorando: ${currentMap.name} - Sala ${room}`,
    "text-info fw-bold",
  );
  logMessage(
    `Um grupo de ${numEnemies} inimigo(s) apareceu!`,
    "text-warning fw-bold",
  );

  buildTurnQueue();
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

    // Garante que a IA não acumule turnos
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

  // Não aceita alvos mortos
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

  // 1. O Herói dá o pulo
  const attackerCard = document.getElementById(`card-${attacker.id}`);
  if (attackerCard) attackerCard.classList.add("anim-attack-hero");

  // 2. Espera o pulo bater pra calcular o dano
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

      // AVISA A QUAL ANIMAÇÃO ELA DEVE TOCAR
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

  // Monstro dá o pulo pra esquerda!
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

      // AVISA A QUAL ANIMAÇÃO TOCAR
      if (target.stats.current_hp <= 0) {
        target.justDied = true;
        logMessage(`${target.name} caiu em combate!`, "text-danger fw-bold");
      } else {
        target.justTookDamage = true;
      }
    }

    updateUI();

    if (!checkBattleEnd()) {
      clearTimeout(turnTimer);
      turnTimer = setTimeout(() => {
        processNextTurn();
      }, 1500);
    }
  }, 300);
}

function giveReward() {
  const goldReward = 30 * gameState.currentRoom;
  myGroup.gold += goldReward;
  logMessage(`O grupo encontrou ${goldReward} moedas de ouro!`, "text-warning");
  updateUI();
}

function checkBattleEnd() {
  const aliveHeroes = myGroup.members.filter((h) => h.stats.current_hp > 0);
  const aliveEnemies = gameState.enemiesLive.filter(
    (e) => e.stats.current_hp > 0,
  );

  if (aliveHeroes.length === 0) {
    logMessage(
      `GAME OVER! Seu grupo foi aniquilado na Sala ${gameState.currentRoom}...`,
      "text-danger fw-bold",
    );
    btnAttack.disabled = true;
    btnSkill.disabled = true;
    btnPotion.disabled = true;
    return true;
  }

  if (aliveEnemies.length === 0) {
    logMessage(`SALA ${gameState.currentRoom} LIMPA!`, "text-success fw-bold");
    giveReward();

    if (gameState.currentRoom >= gameState.maxRooms) {
      logMessage(
        `DUNGEON CONCLUÍDA! Você venceu a Caverna!`,
        "text-warning fw-bold text-uppercase",
      );
      btnAttack.disabled = true;
      btnSkill.disabled = true;
      btnPotion.disabled = true;

      // Libera o próximo mapa!
      myGroup.dungeonsCleared++;

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
        .then((data) => console.log("Servidor diz: ", data.message))
        .catch((err) => console.error("Erro ao salvar progresso:", err));

      setTimeout(() => {
        showScreen("screen-map");
        renderMapScreen();
      }, 3000);
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
      }, 2000);
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
  btnAttack.disabled = true;
  btnSkill.disabled = true;
  btnPotion.disabled = true;

  const healAmount = 50;
  hero.stats.current_hp = Math.min(
    hero.stats.current_hp + healAmount,
    hero.stats.max_hp,
  );
  logMessage(
    `${hero.name} bebeu uma Poção e recuperou ${healAmount} HP!`,
    "text-success fw-bold",
  );

  hero.justHealed = true; // Acende a carta em verde!

  updateUI();
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

  // Animação da Magia
  const heroCard = document.getElementById(`card-${hero.id}`);
  if (heroCard) heroCard.classList.add("anim-skill-use");

  // 2. Espera a animação terminar para soltar o poder
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
        h.justHealed = true; // Faz TODOS os heróis brilharem em verde
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

        // Tremor em área ou Morte em área!
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

    updateUI(); // Executa todos os tremores, mortes e curas de uma vez

    if (!checkBattleEnd()) {
      clearTimeout(turnTimer);
      turnTimer = setTimeout(() => {
        processNextTurn();
      }, 2000);
    }
  }, 600);
});
