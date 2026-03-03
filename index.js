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

// ==========================================
// 2. ESTADO DO JOGO E SAVE
// ==========================================
// Meu Grupo
let myGroup = { name: "Grupo do Herói", gold: 0, members: [] };

// Estado da Batalha
let gameState = { heroLive: null, enemyLive: null, whoTurn: "hero" };

// ==========================================
// 3. INICIALIZAÇÃO
// ==========================================
init();

async function init() {
  logMessage("Iniciando o jogo...");
  const dbLoaded = await loadDatabase();

  if (dbLoaded) {
    // Clona os personagens para o grupo
    myGroup.members = structuredClone(database.characters);

    // Configura a batalha inicial
    gameState.heroLive = myGroup.members[0];
    gameState.enemyLive = structuredClone(database.enemies[0]);

    // Atualiza a tela com os dados
    updateUI();
    logMessage(`Um ${gameState.enemyLive.name} selvagem apareceu!`);

    btnAttack.disabled = false;
    btnPotion.disabled = false;
  } else {
    logMessage("Erro ao carregar o banco de dados.", "text-danger");
  }
}

// ==========================================
// 4. EVENTOS DE CLIQUE (BOTÕES)
// ==========================================
// Botão de ATACAR
btnAttack.addEventListener("click", () => {
  if (gameState.whoTurn === "hero") {
    // Desativa os botões para evitar spam
    btnAttack.disabled = true;
    btnPotion.disabled = true;
    executeAttack("hero");
  }
});

// Botão de USAR POÇÃO
btnPotion.addEventListener("click", () => {
  if (gameState.whoTurn === "hero") {
    // Desativa os botões para evitar spam
    btnAttack.disabled = true;
    btnPotion.disabled = true;
    usePotion();
  }
});

// ==========================================
// 5. FUNÇÕES DE INTERFACE (UI)
// ==========================================
function updateUI() {
  const hero = gameState.heroLive;
  const enemy = gameState.enemyLive;

  // Atualiza Herói
  uiHeroName.innerText = hero.name;
  uiHeroHpText.innerText = `${hero.stats.current_hp} / ${hero.stats.max_hp}`;
  const heroHpPercent = (hero.stats.current_hp / hero.stats.max_hp) * 100;
  uiHeroHpBar.style.width = `${Math.max(0, heroHpPercent)}%`;

  // Atualiza Inimigo
  uiEnemyName.innerText = enemy.name;
  uiEnemyHpText.innerText = `${enemy.stats.current_hp} / ${enemy.stats.max_hp}`;
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
// 6. LÓGICA DE COMBATE E MATEMÁTICA
// ==========================================
function calculateDamage(attacker, defender) {
  const baseDamage = attacker.stats.base_attack - defender.stats.base_defense;
  return Math.max(baseDamage, 0);
}

function checkHit(attacker, defender) {
  let hitChance = 85; // Chance base de 85%
  const diferencaVelocidade = attacker.stats.speed - defender.stats.speed;

  hitChance += (diferencaVelocidade * 2);
  hitChance = Math.max(10, Math.min(hitChance, 100)); // Limites de 10% a 100%

  const roll = Math.random() * 100;
  return roll < hitChance;
}

function checkCritical(damage) {
  const critChance = 10; // 10% de chance de crítico
  const roll = Math.random() * 100;
  return roll < critChance ? damage * 2 : damage;
}

function usePotion() {
  const hero = gameState.heroLive;
  const potion = hero.inventory.find(item => item.item_id === 1);

  if (potion && potion.quantity > 0) {
    // Gasta a poção
    potion.quantity -= 1;

    // Cura o herói
    const healAmount = 50;
    hero.stats.current_hp = Math.min(hero.stats.current_hp + healAmount, hero.stats.max_hp);

    logMessage(`🧪 ${hero.name} usou uma Poção de Vida e recuperou ${healAmount} HP!`, "text-success fw-bold");
    updateUI();

    // Passa o turno
    gameState.whoTurn = "enemy";
    nextTurn();
  } else {
    logMessage(`❌ ${hero.name} não tem Poções de Vida!`, "text-warning");
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

  // Checa se acertou
  const acertou = checkHit(attacker, defender);

  if (!acertou) {
    logMessage(`💨 O ataque de ${attacker.name} ERROU! (Esquiva)`, "text-secondary");
  } else {
    // Calcula dano base
    let baseDamage = calculateDamage(attacker, defender);

    // Checa crítico
    let finalDamage = checkCritical(baseDamage);

    if (finalDamage > baseDamage) {
      logMessage(`💥 ACERTO CRÍTICO!`, "text-warning fw-bold");
    }

    // Aplica o dano
    defender.stats.current_hp -= finalDamage;
    logMessage(`⚔️ ${attacker.name} atacou ${defender.name} e causou ${finalDamage} de dano!`);
  }

  updateUI();
  checkBattleStatus();
}

// ==========================================
// 7. GERENCIAMENTO DE TURNOS
// ==========================================
function checkBattleStatus() {
  if (gameState.heroLive.stats.current_hp <= 0) {
    logMessage('💀 GAME OVER! O herói foi derrotado.', 'text-danger fw-bold');

    btnAttack.disabled = true;
    btnPotion.disabled = true;
  } else if (gameState.enemyLive.stats.current_hp <= 0) {
    logMessage('🏆 VITÓRIA! O inimigo foi derrotado.', 'text-success fw-bold');

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
    logMessage(`⏳ Turno de ${gameState.heroLive.name}...`, "text-info");
    btnAttack.disabled = false;
    btnPotion.disabled = false;
  } else {
    // Inicia o turno do inimigo
    enemyTurn();
  }
}

function enemyTurn() {
  logMessage(`⏳ Turno de ${gameState.enemyLive.name}...`, "text-info");

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
  logMessage(`🔥 Um ${gameState.enemyLive.name} apareceu!`, "text-warning fw-bold");

  btnAttack.disabled = false;
  btnPotion.disabled = false;
}