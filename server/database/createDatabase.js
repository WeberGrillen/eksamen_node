import 'dotenv/config';
import { hashPassword } from '../utils/passwordHashing.js';
import connection from './connection.js';


if (!process.env.ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD is not set in .env');
}

const ADMIN_PASSWORD = await hashPassword(process.env.ADMIN_PASSWORD);
const deleteMode = process.argv.includes('--delete');

if (deleteMode) {
  await connection.exec(`DROP TABLE IF EXISTS recipe_comments`);
  await connection.exec(`DROP TABLE IF EXISTS recipe_saves`);
  await connection.exec(`DROP TABLE IF EXISTS recipe_likes`);
  await connection.exec(`DROP TABLE IF EXISTS follows`);
  await connection.exec(`DROP TABLE IF EXISTS recipe_steps`);
  await connection.exec(`DROP TABLE IF EXISTS recipe_ingredients`);
  await connection.exec(`DROP TABLE IF EXISTS recipes`);
  await connection.exec(`DROP TABLE IF EXISTS users`);
}

// Users Table
await connection.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    bio TEXT,
    avatar_data TEXT,
    banner_data TEXT
  )
`);

// Recipe Table
await connection.exec(`
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    image_data TEXT,
    category TEXT CHECK (category IN ('Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Drinks')),
    total_minutes INTEGER,
    servings INTEGER,
    difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Recipe Ingredients Table
await connection.exec(`
  CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    text TEXT NOT NULL,
    UNIQUE(recipe_id, position)
  )
`);

// Recipe Steps Table
await connection.exec(`
  CREATE TABLE IF NOT EXISTS recipe_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    text TEXT NOT NULL,
    timer_seconds INTEGER,
    UNIQUE(recipe_id, position)
  )
`);

// Indexes — SQLite indekserer primary keys og UNIQUE automatisk, men ikke foreign keys.
// recipe_ingredients og recipe_steps behøver ikke eget index: deres
// UNIQUE(recipe_id, position) giver allerede et index hvor recipe_id står først.
await connection.exec(`CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id)`);

await connection.exec(`
  CREATE TABLE IF NOT EXISTS recipe_likes (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, recipe_id)
  )
`);

await connection.exec(`
  CREATE TABLE IF NOT EXISTS recipe_saves (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, recipe_id)
  )
`);

await connection.exec(`
  CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, followed_id),
    CHECK (follower_id <> followed_id)
  )
`);

await connection.exec(`
  CREATE TABLE IF NOT EXISTS recipe_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

await connection.exec(`CREATE INDEX IF NOT EXISTS idx_likes_recipe_id ON recipe_likes(recipe_id)`);
await connection.exec(`CREATE INDEX IF NOT EXISTS idx_saves_recipe_id ON recipe_saves(recipe_id)`);
await connection.exec(`CREATE INDEX IF NOT EXISTS idx_follows_followed_id ON follows(followed_id)`);
await connection.exec(`CREATE INDEX IF NOT EXISTS idx_comments_recipe_id ON recipe_comments(recipe_id)`);


// Insert admin user
await connection.run(
  `INSERT INTO users (name, email, password)
   VALUES (?, ?, ?)
   ON CONFLICT(email) DO NOTHING`,
  ['admin', 'admin@admin.com', ADMIN_PASSWORD]
);

const seedMode = deleteMode || process.argv.includes('--seed');

if (seedMode) {
  const DEMO_PASSWORD = await hashPassword('demo1234');

  const seedUsers = [
    { name: 'Mara Lindqvist', email: 'mara@foodie.dev',
      bio: 'Home cook · sourdough obsessed · shares what actually works on a Tuesday night.' },
    { name: 'Dev Patel', email: 'dev@foodie.dev',
      bio: 'Chili crisp on everything. Yes, everything.' },
    { name: 'Elena Rossi', email: 'elena@foodie.dev',
      bio: 'Weeknight dinners in under 30 minutes, mostly fish.' }
  ];

  for (const u of seedUsers) {
    await connection.run(
      `INSERT INTO users (name, email, password, bio)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(email) DO NOTHING`,
      [u.name, u.email, DEMO_PASSWORD, u.bio]
    );
  }

  const seedRecipes = [
    {
      author: 'mara@foodie.dev',
      title: 'Sunday Sourdough Waffles',
      description: 'Uses the discard you were about to throw out. Crisp outside, custardy inside.',
      category: 'Breakfast', total_minutes: 30, servings: 4, difficulty: 'Easy',
      ingredients: ['200 g sourdough discard', '2 large eggs', '60 g melted butter',
                    '1 tsp baking soda', '1 tbsp sugar', 'Pinch of salt'],
      steps: [
        { text: 'Whisk the discard, eggs and melted butter until smooth.', timer: null },
        { text: 'Stir in sugar and salt, then fold in the baking soda last.', timer: null },
        { text: 'Let the batter rest so it puffs up.', timer: 600 },
        { text: 'Cook in a hot waffle iron until deep golden.', timer: 240 }
      ]
    },
    {
      author: 'elena@foodie.dev',
      title: 'Weeknight Miso Salmon',
      description: 'Four pantry ingredients, one sheet pan, done before the rice finishes.',
      category: 'Dinner', total_minutes: 25, servings: 2, difficulty: 'Easy',
      ingredients: ['2 salmon fillets', '2 tbsp white miso', '1 tbsp honey',
                    '1 tbsp rice vinegar', '1 tsp sesame oil', 'Scallions to finish'],
      steps: [
        { text: 'Whisk miso, honey, rice vinegar and sesame oil into a glaze.', timer: null },
        { text: 'Brush the salmon with glaze and let it sit.', timer: 600 },
        { text: 'Broil until caramelised and just cooked through.', timer: 480 },
        { text: 'Scatter with sliced scallions and serve.', timer: null }
      ]
    },
    {
      author: 'dev@foodie.dev',
      title: 'Charred Broccoli with Chili Crisp',
      description: 'Hard char, no steaming. The broccoli should look slightly burnt.',
      category: 'Lunch', total_minutes: 20, servings: 2, difficulty: 'Easy',
      ingredients: ['1 large head broccoli', '2 tbsp neutral oil', '2 tbsp chili crisp',
                    '1 tbsp soy sauce', '1 garlic clove, grated', 'Squeeze of lime'],
      steps: [
        { text: 'Cut the broccoli into flat-sided florets so they sit against the pan.', timer: null },
        { text: 'Sear cut-side down in a dry hot pan without moving them.', timer: 300 },
        { text: 'Add oil and garlic, toss until fragrant.', timer: 60 },
        { text: 'Off the heat, fold through chili crisp, soy and lime.', timer: null }
      ]
    },
    {
      author: 'mara@foodie.dev',
      title: 'Slow Roasted Tomato Soup',
      description: 'Roasting does all the work. No stock, no cream, still tastes rich.',
      category: 'Lunch', total_minutes: 90, servings: 4, difficulty: 'Easy',
      ingredients: ['1.5 kg ripe tomatoes, halved', '1 head garlic, cloves peeled',
                    '1 onion, quartered', '3 tbsp olive oil', '1 tsp salt',
                    'Handful of basil'],
      steps: [
        { text: 'Toss tomatoes, garlic and onion with oil and salt on a large tray.', timer: null },
        { text: 'Roast at 200°C until the edges are dark and jammy.', timer: 3600 },
        { text: 'Blend everything, including the pan juices, until smooth.', timer: null },
        { text: 'Warm through with the basil and taste for salt.', timer: 300 }
      ]
    },
    {
      author: 'elena@foodie.dev',
      title: 'Brown Sugar Peach Galette',
      description: 'Forgiving pastry — if it cracks, patch it. Nobody will know.',
      category: 'Dessert', total_minutes: 75, servings: 8, difficulty: 'Medium',
      ingredients: ['250 g flour', '170 g cold butter, cubed', '60 ml ice water',
                    '5 ripe peaches, sliced', '80 g brown sugar', '1 tbsp cornstarch'],
      steps: [
        { text: 'Rub the butter into the flour until you have coarse crumbs, then add the water.', timer: null },
        { text: 'Chill the dough until firm.', timer: 1800 },
        { text: 'Toss the peaches with brown sugar and cornstarch.', timer: null },
        { text: 'Roll out, pile the fruit in the middle, fold the edges over.', timer: null },
        { text: 'Bake at 190°C until the pastry is deep golden.', timer: 2400 }
      ]
    },
    {
      author: 'dev@foodie.dev',
      title: 'Iced Vanilla Oat Latte',
      description: 'Sweeten the espresso while it is hot, otherwise the sugar just sits there.',
      category: 'Drinks', total_minutes: 5, servings: 1, difficulty: 'Easy',
      ingredients: ['2 shots espresso', '1 tsp vanilla syrup', '200 ml oat milk', 'Ice'],
      steps: [
        { text: 'Stir the vanilla syrup into the hot espresso until dissolved.', timer: null },
        { text: 'Fill a glass with ice and pour over the oat milk.', timer: null },
        { text: 'Pour the espresso over the back of a spoon for the layered look.', timer: null }
      ]
    }
  ];

  for (const r of seedRecipes) {
    const author = await connection.get(`SELECT id FROM users WHERE email = ?`, [r.author]);

    const exists = await connection.get(
      `SELECT id FROM recipes WHERE title = ? AND user_id = ?`,
      [r.title, author.id]
    );
    if (exists) continue;

    const result = await connection.run(
      `INSERT INTO recipes (user_id, title, description, category, total_minutes, servings, difficulty)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [author.id, r.title, r.description, r.category, r.total_minutes, r.servings, r.difficulty]
    );

    const recipeId = result.lastID;

    for (let i = 0; i < r.ingredients.length; i++) {
      await connection.run(
        `INSERT INTO recipe_ingredients (recipe_id, position, text) VALUES (?, ?, ?)`,
        [recipeId, i + 1, r.ingredients[i]]
      );
    }

    for (let i = 0; i < r.steps.length; i++) {
      await connection.run(
        `INSERT INTO recipe_steps (recipe_id, position, text, timer_seconds) VALUES (?, ?, ?, ?)`,
        [recipeId, i + 1, r.steps[i].text, r.steps[i].timer]
      );
    }
  }

  // Follows, likes, saves og kommentarer mellem seed-brugerne
  const users = await connection.all(`SELECT id, email FROM users`);
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u.id]));
  const recipes = await connection.all(`SELECT id, title, user_id FROM recipes`);

  const relations = [
    ['admin@admin.com', 'mara@foodie.dev'],
    ['admin@admin.com', 'dev@foodie.dev'],
    ['mara@foodie.dev', 'elena@foodie.dev'],
    ['dev@foodie.dev', 'mara@foodie.dev'],
    ['elena@foodie.dev', 'mara@foodie.dev']
  ];

  for (const [follower, followed] of relations) {
    await connection.run(
      `INSERT OR IGNORE INTO follows (follower_id, followed_id) VALUES (?, ?)`,
      [byEmail[follower], byEmail[followed]]
    );
  }

  for (const recipe of recipes) {
    for (const u of users) {
      if (u.id === recipe.user_id) continue;
      await connection.run(
        `INSERT OR IGNORE INTO recipe_likes (user_id, recipe_id) VALUES (?, ?)`,
        [u.id, recipe.id]
      );
    }
  }

  const savedTitles = ['Weeknight Miso Salmon', 'Iced Vanilla Oat Latte'];
  for (const recipe of recipes.filter((r) => savedTitles.includes(r.title))) {
    await connection.run(
      `INSERT OR IGNORE INTO recipe_saves (user_id, recipe_id) VALUES (?, ?)`,
      [byEmail['admin@admin.com'], recipe.id]
    );
  }

  const comments = [
    ['Weeknight Miso Salmon', 'mara@foodie.dev', 'Made this twice this week. The glaze is the whole thing.'],
    ['Weeknight Miso Salmon', 'dev@foodie.dev', 'Added chili crisp on top. No regrets.'],
    ['Sunday Sourdough Waffles', 'elena@foodie.dev', 'Finally a use for the discard jar.']
  ];

  for (const [title, email, text] of comments) {
    const recipe = recipes.find((r) => r.title === title);
    if (!recipe) continue;
    await connection.run(
      `INSERT INTO recipe_comments (recipe_id, user_id, text) VALUES (?, ?, ?)`,
      [recipe.id, byEmail[email], text]
    );
  }
}

await connection.close();