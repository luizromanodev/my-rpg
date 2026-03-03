export const database = {
  characters: [],
  items: [],
  enemies: [],
};

export async function loadDatabase() {
  try {
    const [resCharacters, resItems, resEnemies] = await Promise.all([
      fetch('/data/characters.json'),
      fetch('/data/items.json'),
      fetch('/data/enemies.json'),
    ]);

    database.characters = await resCharacters.json();
    database.items = await resItems.json();
    database.enemies = await resEnemies.json();

    console.log('Database loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading database:', error);
    return false;
  }
}