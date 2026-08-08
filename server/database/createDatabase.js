import 'dotenv/config';
import { hashPassword } from '../utils/passwordHashing.js';
import connection from './connection.js';


if (!process.env.ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD is not set in .env');
}

const ADMIN_PASSWORD = await hashPassword(process.env.ADMIN_PASSWORD);
const deleteMode = process.argv.includes('--delete');

if (deleteMode) {
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
    password TEXT NOT NULL
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


// Insert admin user
await connection.run(
  `INSERT INTO users (name, email, password)
   VALUES (?, ?, ?)
   ON CONFLICT(email) DO NOTHING`,
  ['admin', 'admin@admin.com', ADMIN_PASSWORD]
);

await connection.close();