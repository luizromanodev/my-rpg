export const database = {
  characters: [],
  items: [],
  enemies: [],
  maps: [],
};

const API_URL = "http://localhost:3000/api";

export async function loadDatabase() {
  try {
    console.log("Conectando ao servidor...");

    const [resCharacters, resItems, resEnemies, resMaps] = await Promise.all([
      fetch(`${API_URL}/characters`),
      fetch(`${API_URL}/items`),
      fetch(`${API_URL}/enemies`),
      fetch(`${API_URL}/maps`),
    ]);

    if (!resCharacters.ok || !resItems.ok || !resEnemies.ok || !resMaps.ok) {
      throw new Error("Falha ao comunicar com a API");
    }

    database.characters = await resCharacters.json();
    database.items = await resItems.json();
    database.enemies = await resEnemies.json();
    database.maps = await resMaps.json();

    console.log("Dados da API carregados com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro na API:", error);
    return false;
  }
}
