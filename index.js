import { database, loadDatabase } from "./data/database.js";

// ==========================================
// ELEMENTOS DA INTERFACE (DOM)
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

let currentUser = null;

function showScreen(screenId) {
  screenLogin.classList.add("d-none");
  screenTavern.classList.add("d-none");
  screenBattle.classList.add("d-none");
  document.getElementById(screenId).classList.remove("d-none");
}

btnStartAdventure.addEventListener("click", () => {
  showScreen("screen-battle");
});

// Acesso à API de contas
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

// ==========================================
// ESTADO DO JOGO E SAVE
// ==========================================
// Meu Grupo
let myGroup = { name: "Grupo do Herói", gold: 0, members: [] };

// Estado da Batalha
let gameState = { heroLive: null, enemyLive: null, whoTurn: "hero" };

// ==========================================
// INICIALIZAÇÃO
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

// ... DAQUI PRA BAIXO CONTINUA IGUALZINHO (A partir dos botões de Atacar e Poção) ...