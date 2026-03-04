const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const readJsonFile = (fileName, res) => {
  try {
    const filePath = path.join(__dirname, 'data', fileName);
    const fileData = fs.readFileSync(filePath, 'utf-8');
    res.status(200).json(JSON.parse(fileData));
  } catch (error) {
    console.error(`Erro ao ler ${fileName}:`, error);
    res.status(500).json({ error: `Falha interna no servidor` });
  }
};

// ---------------------------------------------------
// ROTAS DA API
// ---------------------------------------------------

app.get('/', (req, res) => res.send('API do RPG está funcionando!'));

app.get('/api/characters', (req, res) => readJsonFile('characters.json', res));
app.get('/api/items', (req, res) => readJsonFile('items.json', res));
app.get('/api/enemies', (req, res) => readJsonFile('enemies.json', res));

// ---------------------------------------------------
// SERVIDOR ON
// ---------------------------------------------------

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});
