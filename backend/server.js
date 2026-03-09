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

// --- ROTAS DO JOGO ---
app.get("/", (req, res) => res.send("API do RPG está funcionando!"));

app.get("/api/characters", (req, res) => readJsonFile("characters.json", res));
app.get("/api/items", (req, res) => readJsonFile("items.json", res));
app.get("/api/enemies", (req, res) => readJsonFile("enemies.json", res));

// --- ROTAS DE CONTAS ---
app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  let accounts = JSON.parse(fs.readFileSync(accountsPath, "utf-8"));

  if (accounts[username]) {
    return res.status(400).json({ error: "Usuário já existe" });
  }

  accounts[username] = {
    password: password,
    saveData: { gold: 0, dungeonsCleared: 0, team: [] },
  };

  fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
  res.status(201).json({ message: "Conta criada com sucesso" });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const accounts = JSON.parse(fs.readFileSync(accountsPath, "utf-8"));

  if (accounts[username] && accounts[username].password === password) {
    res.status(200).json({
      message: "Login bem-sucedido",
      saveData: accounts[username].saveData,
    });
  } else {
    res.status(401).json({ error: "Usuario ou senha inválidos" });
  }
});

// Rota de salvar o  time
app.post("/api/save-team", (req, res) => {
  const { username, team } = req.body;
  let accounts = JSON.parse(fs.readFileSync(accountsPath, "utf-8"));

  if (accounts[username]) {
    accounts[username].saveData.team = team;
    fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
    res.status(200).json({ message: "Time salvo com sucesso" });
  } else {
    res.status(404).json({ error: "Usuário não encontrado" });
  }
});

// --- SALVAR PROGRESSO DA DUNGEON ---
app.post("api/save-progress", (req, res) => {
  const { username, dungeonsCleared, gold } = req.body;
  let accounts = JSON.parse(fs.readFileSync(accountsPath, "utf-8"));

  if (accounts[username]) {
    // Atualia ouro e dungeons
    accounts[username].saveData.dungeonsCleared = dungeonsCleared;
    accounts[username].saveData.gold = gold;

    fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
    res
      .status(200)
      .json({ message: "Progresso salvo com sucesso no banco de dados!" });
  } else {
    res.status(404).json({ error: "Usuário não encontrado" });
  }
});

// --- SALVAR BATALHA EM TEMPO REAL ---
app.post("api/save-battle", (req, res) => {
  const { username, team, dungeonState } = req.body;
  let accounts = JSON.parse(fs.readFileSync(accountsPath, "utf-8"));

  if (accounts[username]) {
    accounts[username].saveData.team = team;
    accounts[username].saveData.dungeonState = dungeonState;

    fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
    res.status(200).json({ message: "Batalha salva em tempo real!" });
  } else {
    res.status(400).json({ error: "Usuàrio não encontrado" });
  }
});

// --- SERVIDOR ON ---
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});
