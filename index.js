import { database, loadDatabase } from "./data/database.js";

// ==========================================
// 1. ELEMENTOS DA INTERFACE (DOM)
// ==========================================
const uiHeroName = document.getElementById("hero-name");
const uiHeroHpText = document.getElementById("hero-hp-text");
const uiHeroHpBar = document.getElementById("hero-hp-bar");

const uiEnemyName = document.getElementById("enemy-name");
const uiEnemyHpText = document.getElementById("enemy-hp-text");
const uiEnemyHpBar = document.getElementById("enemy-hp-bar");

const btnAttack = document.getElementById("btn-attack");
const battleLog = document.getElementById("battle-log");
const btnPotion = document.getElementById("btn-potion");
const uiGoldCounter = document.getElementById("gold-counter");
const uiHeroPotions = document.getElementById("hero-potions");

const screenLogin = document.getElementById("screen-login");
const screenTavern = document.getElementById("screen-tavern");
const screenBattle = document.getElementById("screen-battle");

const inputUser = document.getElementById("input-username");
const inputPass = document.getElementById("input-password");
const btnLogin = document.getElementById("btn-login");
const btnRegister = document.getElementById("btn-register");
const loginMsg = document.getElementById("login-msg");
const btnStartAdventure = document.getElementById("btn-start-adventure");

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
        setTimeout(() => showScreen("screen-tavern"), 1000);
      }
    }
  } catch (err) {
    loginMsg.innerText = "Erro de conexão com o servidor.";
    loginMsg.className = "mt-3 mb-0 fw-bold text-danger";
  }
}

btnLogin.addEventListener("click", () => handleAccount("login"));
btnRegister.addEventListener("click", () => handleAccount("register"));

// Configura e inicia a batalha
btnStartAdventure.addEventListener("click", () => {
  showScreen("screen-battle");

  if (myGroup.members.length === 0) {
    myGroup.members.push(structuredClone(database.characters[0]));
  }

  gameState.heroLive = myGroup.members[0];

  // Sorteia um inimigo
  const randomIndex = Math.floor(Math.random() * database.enemies.length);
  gameState.enemyLive = structuredClone(database.enemies[randomIndex]);
  gameState.whoTurn = "hero";

  // Atualiza a interface da arena
  updateUI();
  battleLog.innerHTML = ""; // Limpa o log de lutas antigas
  logMessage(`Um ${gameState.enemyLive.name} selvagem apareceu!`, "text-warning fw-bold");

  // Libera os botões de ação
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
  const hero = gameState.heroLive;
  const enemy = gameState.enemyLive;

  // Atualiza Herói
  uiHeroName.innerText = hero.name;

  const heroHpVisual = Math.max(0, hero.stats.current_hp);
  uiHeroHpText.innerText = `${heroHpVisual} / ${hero.stats.max_hp}`;

  const heroHpPercent = (hero.stats.current_hp / hero.stats.max_hp) * 100;
  uiHeroHpBar.style.width = `${Math.max(0, heroHpPercent)}%`;

  // Atualiza Inimigo
  uiEnemyName.innerText = enemy.name;

  const enemyHpVisual = Math.max(0, enemy.stats.current_hp);
  uiEnemyHpText.innerText = `${enemyHpVisual} / ${enemy.stats.max_hp}`;

  const enemyHpPercent = (enemy.stats.current_hp / enemy.stats.max_hp) * 100;
  uiEnemyHpBar.style.width = `${Math.max(0, enemyHpPercent)}%`;

  // Atualiza Ouro e Poções
  uiGoldCounter.innerText = myGroup.gold;

  const potion = hero.inventory.find(item => item.item_id === 1);
  const quantity = potion ? potion.quantity : 0;
  uiHeroPotions.innerText = `Poções: ${quantity}`;
}

function logMessage(msg, colorClass = "text-light") {
  const p = document.createElement("p");
  p.className = `m-0 ${colorClass}`;
  p.innerText = msg;
  battleLog.appendChild(p);
  battleLog.scrollTop = battleLog.scrollHeight;
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