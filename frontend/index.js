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
let gameState = { heroLive: null, enemyLive: null, whoTurn: "hero" };

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
      body: JSON.stringify({ username, password })
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
          gameState.heroLive = myGroup.members[0];

          const randomIndex = Math.floor(Math.random() * database.enemies.length);
          gameState.enemyLive = structuredClone(database.enemies[randomIndex]);
          gameState.whoTurn = "hero";

          updateUI();
          battleLog.innerHTML = "";
          logMessage(`Bem-vindo de volta! Um ${gameState.enemyLive.name} apareceu!`, "text-warning fw-bold");

          btnAttack.disabled = false;
          btnPotion.disabled = false;

          setTimeout(() => showScreen("screen-battle"), 1000);
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

// Configura e inicia a batalha
btnStartAdventure.addEventListener("click", async () => {
  if (myGroup.members.length !== 3) return;

  // Envia o time para salvar no servidor
  try {
    await fetch('http://localhost:3000/api/save-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser, team: myGroup.members })
    });
    console.log("Time salvo no servidor com sucesso!");
  } catch (err) {
    console.error("Erro ao salvar time:", err);
  }

  showScreen("screen-battle");

  gameState.heroLive = myGroup.members[0];

  const randomIndex = Math.floor(Math.random() * database.enemies.length);
  gameState.enemyLive = structuredClone(database.enemies[randomIndex]);
  gameState.whoTurn = "hero";

  updateUI();
  battleLog.innerHTML = "";
  logMessage(`Um ${gameState.enemyLive.name} selvagem apareceu!`, "text-warning fw-bold");

  btnAttack.disabled = false;
  btnPotion.disabled = false;
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
    loginMsg.innerText = "Erro ao carregar o banco de dados. O servidor está ligado?";
    loginMsg.className = "mt-3 mb-0 fw-bold text-danger";
  }
}

// ==========================================
// 5. EVENTOS DE CLIQUE
// ==========================================
btnAttack.addEventListener("click", () => {
  if (gameState.whoTurn === "hero") {
    btnAttack.disabled = true;
    btnPotion.disabled = true;
    executeAttack("hero");
  }
});

btnPotion.addEventListener("click", () => {
  if (gameState.whoTurn === "hero") {
    btnAttack.disabled = true;
    btnPotion.disabled = true;
    usePotion();
  }
});

// ==========================================
// 6. FUNÇÕES DE INTERFACE 
// ==========================================
function updateUI() {
  // Atualiza ouro
  uiGoldCounter.innerText = myGroup.gold;

  // Atualiza time do herói
  heroTeamContainer.innerHTML = "";
  myGroup.members.forEach(member => {
    const hpPercent = (member.stats.current_hp / member.stats.max_hp) * 100;
    const isDead = member.stats.current_hp <= 0;

    const card = document.createElement("div");
    card.className = `mini-card text-light ${isDead ? 'opacity-50' : ''}`;
    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <strong class="${isDead ? 'text-decoration-line-through text-secondary' : 'text-info'}">${hero.name}</strong>
        <span class="badge bg-secondary">${hero.role}</span>
      </div>
      <p class="mt-1 mb-1">HP: ${Math.max(0, hero.stats.current_hp)} / ${hero.stats.max_hp}</p>
      <div class="progress">
        <div class="progress-bar ${isDead ? 'bg-secondary' : 'bg-success'}" style="width: ${Math.max(0, hpPercent)}%"></div>
      </div>
    `;
    heroTeamContainer.appendChild(card);
  });

  enemyTeamContainer.innerHTML = "";

  const enemies = Array.isArray(gameState.enemyLive) ? gameState.enemyLive : [gameState.enemyLive];

  enemies.forEach((enemy) => {
    if (!enemy) return;
    const hpPercent = (enemy.stats.current_hp / enemy.stats.max_hp) * 100;
    const isDead = enemy.stats.current_hp <= 0;

    const card = document.createElement("div");
    card.className = `mini-card text-light ${isDead ? 'opacity-50' : ''}`;
    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <strong class="${isDead ? 'text-decoration-line-through text-secondary' : 'text-danger'}">${enemy.name}</strong>
      </div>
      <p class="mt-1 mb-1">HP: ${Math.max(0, enemy.stats.current_hp)} / ${enemy.stats.max_hp}</p>
      <div class="progress">
        <div class="progress-bar ${isDead ? 'bg-secondary' : 'bg-danger'}" style="width: ${Math.max(0, hpPercent)}%"></div>
      </div>
    `;
    enemyTeamContainer.appendChild(card);
  });

  if (gameState.whoTurn === "hero") {
    turnIndicator.innerText = `Turno de ${gameState.heroLive.name}`;
    turnIndicator.className = "badge bg-primary text-light fs-6 mb-2";
  } else {
    turnIndicator.innerText = `Turno de ${gameState.enemyLive.name}`;
    turnIndicator.className = "badge bg-danger text-light fs-6 mb-2";
  }
}

function logMessage(msg, colorClass = "text-light") {
  const p = document.createElement("p");
  p.className = `m-0 ${colorClass}`;
  p.innerText = msg;
  battleLog.appendChild(p);
  battleLog.scrollTop = battleLog.scrollHeight;
}

// ==========================================
// SELEÇÃO DE EQUIPE
// ==========================================

function renderTavern() {
  rosterContainer.innerHTML = "";
  myGroup.members = [];

  btnStartAdventure.disabled = true;
  btnStartAdventure.innerText = `Selecione 3 Heróis (0/3)`;
  btnStartAdventure.className = "btn btn-secondary btn-lg fw-bold shadow mt-3"

  database.characters.forEach(char => {
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
      const isSelected = myGroup.members.some(m => m.id === char.id);

      if (isSelected) {
        myGroup.members = myGroup.members.filter(m => m.id !== char.id);
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
        btnStartAdventure.className = "btn btn-warning btn-lg fw-bold shadow mt-3";
      } else {
        btnStartAdventure.disabled = true;
        btnStartAdventure.innerText = `Selecione 3 Heróis (${count}/3)`;
        btnStartAdventure.className = "btn btn-secondary btn-lg fw-bold shadow mt-3";
      }
    });

    col.appendChild(card);
    rosterContainer.appendChild(col);
  });
}

// ==========================================
// 7. LÓGICA DE COMBATE
// ==========================================
function calculateDamage(attacker, defender) {
  const baseDamage = attacker.stats.base_attack - defender.stats.base_defense;
  return Math.max(baseDamage, 0);
}

function checkHit(attacker, defender) {
  let hitChance = 85;
  const diferencaVelocidade = attacker.stats.speed - defender.stats.speed;

  hitChance += (diferencaVelocidade * 2);
  hitChance = Math.max(10, Math.min(hitChance, 100));

  const roll = Math.random() * 100;
  return roll < hitChance;
}

function checkCritical(damage) {
  const critChance = 10;
  const roll = Math.random() * 100;
  return roll < critChance ? damage * 2 : damage;
}

function usePotion() {
  const hero = gameState.heroLive;
  const potion = hero.inventory.find(item => item.item_id === 1);

  if (potion && potion.quantity > 0) {
    potion.quantity -= 1;

    const healAmount = 50;
    hero.stats.current_hp = Math.min(hero.stats.current_hp + healAmount, hero.stats.max_hp);

    logMessage(`${hero.name} usou uma Poção de Vida e recuperou ${healAmount} HP!`, "text-success fw-bold");
    updateUI();

    gameState.whoTurn = "enemy";
    nextTurn();
  } else {
    logMessage(`${hero.name} não tem Poções de Vida!`, "text-warning");
    btnAttack.disabled = false;
    btnPotion.disabled = false;
  }
}

function giveReward() {
  const goldReward = gameState.enemyLive.stats.base_attack * 10;
  myGroup.gold += goldReward;
  logMessage(`💰 ${gameState.heroLive.name} recebeu ${goldReward} de ouro como recompensa!`, "text-warning");
  updateUI();
}

function executeAttack(attackerType) {
  const attacker = attackerType === "hero" ? gameState.heroLive : gameState.enemyLive;
  const defender = attackerType === "hero" ? gameState.enemyLive : gameState.heroLive;

  const acertou = checkHit(attacker, defender);

  if (!acertou) {
    logMessage(`O ataque de ${attacker.name} ERROU! (Esquiva)`, "text-secondary");
  } else {
    let baseDamage = calculateDamage(attacker, defender);
    let finalDamage = checkCritical(baseDamage);

    if (finalDamage > baseDamage) {
      logMessage(`ACERTO CRÍTICO!`, "text-warning fw-bold");
    }

    defender.stats.current_hp -= finalDamage;
    logMessage(`${attacker.name} atacou ${defender.name} e causou ${finalDamage} de dano!`);
  }

  updateUI();
  checkBattleStatus();
}

// ==========================================
// 8. GERENCIAMENTO DE TURNOS
// ==========================================
function checkBattleStatus() {
  if (gameState.heroLive.stats.current_hp <= 0) {
    logMessage('DERROTA! O herói foi derrotado.', 'text-danger fw-bold');
    btnAttack.disabled = true;
    btnPotion.disabled = true;
  } else if (gameState.enemyLive.stats.current_hp <= 0) {
    logMessage('VITÓRIA! O inimigo foi derrotado.', 'text-success fw-bold');
    giveReward();
    btnAttack.disabled = true;
    btnPotion.disabled = true;

    setTimeout(() => {
      generateNewEnemy();
    }, 2000);
  } else {
    gameState.whoTurn = gameState.whoTurn === "hero" ? "enemy" : "hero";
    nextTurn();
  }
}

function nextTurn() {
  if (gameState.whoTurn === "hero") {
    logMessage(`Turno de ${gameState.heroLive.name}...`, "text-info");
    btnAttack.disabled = false;
    btnPotion.disabled = false;
  } else {
    enemyTurn();
  }
}

function enemyTurn() {
  logMessage(`Turno de ${gameState.enemyLive.name}...`, "text-info");

  setTimeout(() => {
    executeAttack("enemy");
  }, 1000);
}

function generateNewEnemy() {
  logMessage(`--- NOVA BATALHA ---`, "text-secondary fw-bold");

  const randomIndex = Math.floor(Math.random() * database.enemies.length);
  const newEnemy = database.enemies[randomIndex];

  gameState.enemyLive = structuredClone(newEnemy);
  gameState.whoTurn = "hero";

  updateUI();
  logMessage(`Um ${gameState.enemyLive.name} apareceu!`, "text-warning fw-bold");

  btnAttack.disabled = false;
  btnPotion.disabled = false;
}