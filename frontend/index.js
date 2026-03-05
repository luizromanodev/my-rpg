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
  maxRooms: 3,
};

// ==========================================
// 3. GERENCIAMENTO DE TELAS E CONTAS
// ==========================================
function showScreen(screenId) {
  screenLogin.classList.add("d-none");
  screenTavern.classList.add("d-none");
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

        if (data.saveData.team && data.saveData.team.length === 3) {
          myGroup.members = data.saveData.team;

          setTimeout(() => {
            showScreen("screen-battle");
            startRoom();
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

  showScreen("screen-battle");
  startRoom();
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

    const card = document.createElement("div");
    card.className = `mini-card text-light ${isDead ? "opacity-50" : ""} ${isMyTurn ? "active-turn" : ""}`;
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

    const card = document.createElement("div");
    card.className = `mini-card text-light ${isDead ? "opacity-50" : ""} ${isMyTurn ? "active-turn" : ""} ${isTarget ? "border border-danger border-2" : ""}`;
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
// 7. INICIATIVA E TURNOS
// ==========================================
function startRoom() {
  gameState.enemiesLive = [];

  // Define quantos monstros vão aparecer
  let numEnemies = Math.floor(Math.random() * 3) + 1;

  // Ultima sala sempre tem 3 inimigos
  if (gameState.currentRoom === gameState.maxRooms) {
    numEnemies = 3;
  }

  const letras = ["A", "B", "C"];

  for (let i = 0; i < numEnemies; i++) {
    const randomIndex = Math.floor(Math.random() * database.enemies.length);
    const newEnemy = structuredClone(database.enemies[randomIndex]);

    // Cria ID unico
    newEnemy.battleId = `enemy_${i + 1}`;

    // Adiciona letra no nome para diferenciar o mob
    newEnemy.name = `${newEnemy.name} ${letras[i]}`;

    gameState.enemiesLive.push(newEnemy);
  }

  battleLog.innerHTML = "";
  logMessage(
    `⚔️ Sala ${gameState.currentRoom}: Um grupo de ${numEnemies} inimigo(s) apareceu!`,
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
  // Ordena do mais rápido para o mais lento (Velocidade / Speed)
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
      `\n⏳ Turno de ${gameState.activeCharacter.name}! O que fará?`,
      "text-info",
    );
    turnIndicator.innerText = `Sua vez: ${gameState.activeCharacter.name}!`;
    turnIndicator.className = "badge bg-primary text-light fs-6 mb-2";

    btnAttack.disabled = false;
    btnSkill.disabled = false;
    btnPotion.disabled = false;
  } else {
    logMessage(
      `\n⏳ Turno do Inimigo: ${gameState.activeCharacter.name}...`,
      "text-danger",
    );
    turnIndicator.innerText = `Vez do Inimigo!`;
    turnIndicator.className = "badge bg-danger text-light fs-6 mb-2";

    btnAttack.disabled = true;
    btnSkill.disabled = true;
    btnPotion.disabled = true;
    setTimeout(() => {
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

// Quando o Heroi ataca
btnAttack.addEventListener("click", () => {
  if (!gameState.selectedTarget) {
    logMessage(
      `⚠️ Selecione um alvo clicando no monstro primeiro!`,
      "text-warning",
    );
    return;
  }

  btnAttack.disabled = true;
  btnSkill.disabled = true;
  btnPotion.disabled = true;

  const attacker = gameState.activeCharacter;
  const defender = gameState.selectedTarget;

  // Logica de Acerto
  if (!checkHit(attacker, defender)) {
    logMessage(
      `💨 O ataque de ${attacker.name} ERROU! (Esquiva)`,
      "text-secondary",
    );
  } else {
    let baseDamage = calculateDamage(attacker, defender);
    const finalDamage = checkCritical(baseDamage);

    if (finalDamage > baseDamage)
      logMessage(`💥 ACERTO CRÍTICO!`, "text-warning fw-bold");

    defender.stats.current_hp -= finalDamage;
    logMessage(
      `⚔️ ${attacker.name} atacou ${defender.name} e causou ${finalDamage} de dano!`,
    );

    if (defender.stats.current_hp <= 0) {
      logMessage(`💀 ${defender.name} foi derrotado!`, "text-success fw-bold");
      gameState.selectedTarget = null;
    }
  }

  updateUI();
  if (!checkBattleEnd()) {
    setTimeout(() => {
      processNextTurn();
    }, 1200);
  }
});

// IA do inimigo
function enemyTurnIA() {
  const attacker = gameState.activeCharacter;

  // Pega todos herois vivos
  const aliveHeroes = myGroup.members.filter((h) => h.stats.current_hp > 0);

  if (aliveHeroes.length === 0) {
    logMessage(
      `💀 Seu grupo foi totalmente aniquilado...`,
      "text-danger fw-bold",
    );
    return; // Fim de jogo
  }

  // Escolhe um alvo aleatório
  const target = aliveHeroes[Math.floor(Math.random() * aliveHeroes.length)];

  if (!checkHit(attacker, target)) {
    logMessage(
      `💨 O ataque de ${attacker.name} ERROU ${target.name}!`,
      "text-secondary",
    );
  } else {
    let baseDamage = calculateDamage(attacker, target);
    const finalDamage = checkCritical(baseDamage);

    if (finalDamage > baseDamage) logMessage(`💥 CRÍTICO!`, "text-warning");

    target.stats.current_hp -= finalDamage;
    logMessage(
      `🩸 ${attacker.name} atacou ${target.name} e causou ${finalDamage} de dano!`,
      "text-danger",
    );

    if (target.stats.current_hp <= 0) {
      logMessage(`🪦 ${target.name} caiu em combate!`, "text-danger fw-bold");
    }
  }

  updateUI();

  if (!checkBattleEnd()) {
    setTimeout(() => {
      processNextTurn();
    }, 1500);
  }
}

function giveReward() {
  const goldReward = 30 * gameState.currentRoom;
  myGroup.gold += goldReward;
  logMessage(
    `💰 O grupo encontrou ${goldReward} moedas de ouro!`,
    "text-warning",
  );
  updateUI();
}

// ==========================================
// 9. PROGRESSÃO DA DUNGEON
// ==========================================
function checkBattleEnd() {
  const aliveHeroes = myGroup.members.filter((h) => h.stats.current_hp > 0);
  const aliveEnemies = gameState.enemiesLive.filter(
    (e) => e.stats.current_hp > 0,
  );

  // Todos herois morreram
  if (aliveHeroes.length === 0) {
    logMessage(
      `💀 GAME OVER! Seu grupo foi aniquilado na Sala ${gameState.currentRoom}...`,
      "text-danger fw-bold",
    );
    btnAttack.disabled = true;
    btnSkill.disabled = true;
    btnPotion.disabled = true;
    return true; // Acabou
  }

  // Todos inimigos morreram
  if (aliveEnemies.length === 0) {
    logMessage(
      `🏆 SALA ${gameState.currentRoom} LIMPA!`,
      "text-success fw-bold",
    );
    giveReward();

    // Verifica se era a ultima sala
    if (gameState.currentRoom >= gameState.maxRooms) {
      logMessage(
        `👑 DUNGEON CONCLUÍDA! Você limpou a Caverna dos Goblins!`,
        "text-warning fw-bold text-uppercase",
      );
      btnAttack.disabled = true;
      btnSkill.disabled = true;
      btnPotion.disabled = true;
    } else {
      gameState.currentRoom++;
      logMessage(
        `Avançando para a Sala ${gameState.currentRoom}...`,
        "text-info",
      );

      // Reinicia a batalha com novos inimigos
      gameState.selectedTarget = null;
      setTimeout(() => {
        startRoom();
      }, 2000);
    }
    return true; // Acabou
  }
  return false; // Continua
}

// ==========================================
// 10. HABILIDADES E ITENS
// ==========================================

// Usar poção
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
    `🧪 ${hero.name} bebeu uma Poção e recuperou ${healAmount} HP!`,
    "text-success fw-bold",
  );

  updateUI();
  setTimeout(() => {
    processNextTurn();
  }, 1200);
});

// Usar Habilidade
btnSkill.addEventListener("click", () => {
  const hero = gameState.activeCharacter;

  btnAttack.disabled = true;
  btnSkill.disabled = true;
  btnPotion.disabled = true;

  // Habilidade Tanque
  if (hero.role === "Tanque") {
    hero.stats.base_defense += 5;
    logMessage(
      `🛡️ ${hero.name} usou FORTIFICAR! Sua defesa aumentou drasticamente!`,
      "text-info fw-bold",
    );
  }

  // Habilidade Suporte
  else if (hero.role === "Suporte" || hero.role === "Curandeiro") {
    logMessage(
      `✨ ${hero.name} usou LUZ DIVINA! Todo o grupo foi curado!`,
      "text-success fw-bold",
    );

    // Cura 30 HP de todos herois
    const aliveHeroes = myGroup.members.filter((h) => h.stats.current_hp > 0);
    aliveHeroes.forEach((h) => {
      h.stats.current_hp = Math.min(h.stats.current_hp + 30, h.stats.max_hp);
    });
  }

  // Habilidade de Dano
  else {
    logMessage(
      `🔥 ${hero.name} invocou uma TEMPESTADE! (Dano em Área)`,
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
    });
  }

  updateUI();

  if (!checkBattleEnd()) {
    setTimeout(() => {
      processNextTurn();
    }, 2000);
  }
});
