const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const readJsonFile = (fileName, res) => {
  try {
    const filePath = path.join(__dirname, "data", fileName);
    const fileData = fs.readFileSync(filePath, "utf-8");
    res.status(200).json(JSON.parse(fileData));
  } catch (error) {
    console.error(`Erro ao ler ${fileName}:`, error);
    res.status(500).json({ error: `Falha interna no servidor` });
  }
};

// Caminho do banco de contas
const accountsPath = path.join(__dirname, "data", "accounts.json");

// --- FUNÇÃO AUXILIAR PARA GARANTIR QUE O SLOT EXISTA ---
function ensureSlotExists(account, index) {
  if (!account.slots) account.slots = [null, null, null]; // Atualiza contas antigas
  if (!account.slots[index]) {
    account.slots[index] = {
      gold: 0,
      dungeonsCleared: 0,
      team: [],
      inventory: [],
      dungeonState: null,
    };
  }
}

// --- ROTAS DO JOGO ---
app.get("/", (req, res) => res.send("API do RPG está funcionando!"));

app.get("/api/characters", (req, res) => readJsonFile("characters.json", res));
app.get("/api/items", (req, res) => readJsonFile("items.json", res));
app.get("/api/enemies", (req, res) => readJsonFile("enemies.json", res));
app.get("/api/maps", (req, res) => readJsonFile("maps.json", res));

// --- ROTAS DE CONTAS ---
app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  let accounts = JSON.parse(fs.readFileSync(accountsPath, "utf-8"));

  if (accounts[username]) {
    return res.status(400).json({ error: "Usuário já existe" });
  }

  // A conta tem 3 Slots Vazios
  accounts[username] = {
    password: password,
    slots: [null, null, null],
  };

  fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
  res.status(201).json({ message: "Conta criada com sucesso" });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const accounts = JSON.parse(fs.readFileSync(accountsPath, "utf-8"));

  if (accounts[username] && accounts[username].password === password) {
    //Se for uma conta antiga, ela ganhe a estrutura de slots
    if (!accounts[username].slots)
      accounts[username].slots = [null, null, null];

    res.status(200).json({
      message: "Login bem-sucedido",
      // slots enviados para o frontend desenhar
      saveData: { slots: accounts[username].slots },
    });
  } else {
    res.status(401).json({ error: "Usuario ou senha inválidos" });
  }
});

// --- SALVAR O TIME NO SLOT ESPECÍFICO ---
app.post("/api/save-team", (req, res) => {
  const { username, slotIndex, team } = req.body;
  let accounts = JSON.parse(fs.readFileSync(accountsPath, "utf-8"));

  if (accounts[username]) {
    ensureSlotExists(accounts[username], slotIndex);
    accounts[username].slots[slotIndex].team = team;

    fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
    res.status(200).json({ message: "Time salvo com sucesso" });
  } else {
    res.status(404).json({ error: "Usuário não encontrado" });
  }
});

// --- SALVAR PROGRESSO DA DUNGEON NO SLOT ESPECÍFICO ---
app.post("/api/save-progress", (req, res) => {
  const { username, slotIndex, dungeonsCleared, gold, inventory } = req.body;
  let accounts = JSON.parse(fs.readFileSync(accountsPath, "utf-8"));

  if (accounts[username]) {
    ensureSlotExists(accounts[username], slotIndex);
    accounts[username].slots[slotIndex].dungeonsCleared = dungeonsCleared;
    accounts[username].slots[slotIndex].gold = gold;
    if (inventory) accounts[username].slots[slotIndex].inventory = inventory;

    fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
    res
      .status(200)
      .json({ message: "Progresso salvo com sucesso no banco de dados!" });
  } else {
    res.status(404).json({ error: "Usuário não encontrado" });
  }
});

// --- SALVAR BATALHA EM TEMPO REAL NO SLOT ESPECÍFICO ---
app.post("/api/save-battle", (req, res) => {
  const { username, slotIndex, team, dungeonState, inventory } = req.body;
  let accounts = JSON.parse(fs.readFileSync(accountsPath, "utf-8"));

  if (accounts[username]) {
    ensureSlotExists(accounts[username], slotIndex);
    accounts[username].slots[slotIndex].team = team;
    accounts[username].slots[slotIndex].dungeonState = dungeonState;
    if (inventory) accounts[username].slots[slotIndex].inventory = inventory;

    fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
    res.status(200).json({ message: "Batalha salva em tempo real!" });
  } else {
    res.status(400).json({ error: "Usuário não encontrado" });
  }
});

// --- SERVIDOR ON ---
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});