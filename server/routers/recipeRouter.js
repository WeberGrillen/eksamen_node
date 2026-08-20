import { Router } from 'express';
import db from '../database/connection.js';
import { isLoggedIn } from '../routers/sessionRouter.js' 
import { validateRecipe } from '../utils/recipeValidation.js';

const router = Router();



/* ---------- GET ---------- */

// get all recipes
router.get('/api/recipes', isLoggedIn, async (req, res) => {
    const currentUserId = req.session.user?.id ?? 0;
    
    try {
        const result = await db.all(`
            SELECT recipes.*, users.name AS author_name,
                (SELECT COUNT(*)
                FROM recipe_likes
                WHERE recipe_id = recipes.id) AS like_count,
                    EXISTS(
                        SELECT 1
                        FROM recipe_likes
                        WHERE user_id = ?
                        AND recipe_id = recipes.id
                    ) AS is_liked,
                    EXISTS(
                        SELECT 1
                        FROM recipe_saves
                        WHERE user_id = ?
                        AND recipe_id = recipes.id
                    ) AS is_saved
            FROM recipes
            LEFT JOIN users ON users.id = recipes.user_id
            ORDER BY recipes.created_at DESC
        `, [currentUserId, currentUserId]
    );
        res.status(200).send({
            data: { recipes: result}
        });
    } catch (error) {
        console.error('GET /api/recipes failed:', error);
        res.status(500).send({
            data: { errorMessage: 'Could not fetch recipes' }
        });
    }
});

// trending recipes
router.get('/api/recipes/trending', isLoggedIn, async (req, res) => {
    const currentUserId = req.session.user?.id ?? 0;

    try {
        const recipes = await db.all(`
            SELECT recipes.*, users.name AS author_name,
                COUNT(recipe_likes.recipe_id) AS recent_likes,
                (SELECT COUNT(*)
                FROM recipe_likes
                WHERE recipe_id = recipes.id) AS like_count,
                    EXISTS(
                        SELECT 1
                        FROM recipe_likes
                        WHERE user_id = ?
                        AND recipe_id = recipes.id
                    ) AS is_liked
            FROM recipes
            LEFT JOIN users ON users.id = recipes.user_id
            JOIN recipe_likes ON recipe_likes.recipe_id = recipes.id
            WHERE recipe_likes.created_at >= datetime('now', 'start of day')
            GROUP BY recipes.id
            ORDER BY recent_likes DESC, recipes.created_at DESC
            LIMIT 4
        `, [currentUserId]
    );
        res.status(200).send({
            data: { recipes }
        });
    } catch (error) {
        console.error('GET /api/recipes/trending failed:', error);
        res.status(500).send({
            data: {
                errorMessage: 'Could not fetch trending recipes'
            }
        });
    }
});

// recipes from followed users
router.get('/api/recipes/following', isLoggedIn, async (req, res) => {
    const currentUserId = req.session.user?.id ?? 0;

    try {
        const recipes = await db.all(`
            SELECT recipes.*, users.name AS author_name,
                (SELECT COUNT(*)
                FROM recipe_likes
                WHERE recipe_id = recipes.id) AS like_count,
                    EXISTS(
                        SELECT 1
                        FROM recipe_likes
                        WHERE user_id = ?
                        AND recipe_id = recipes.id
                    ) AS is_liked,
                    EXISTS(
                        SELECT 1
                        FROM recipe_saves
                        WHERE user_id = ?
                        AND recipe_id = recipes.id
                    ) AS is_saved
            FROM recipes
            LEFT JOIN users ON users.id = recipes.user_id
            JOIN follows ON follows.followed_id = recipes.user_id
            WHERE follows.follower_id = ?
            ORDER BY recipes.created_at DESC
        `, [currentUserId, currentUserId, currentUserId]
    );
        res.status(200).send({
            data: { recipes }
        });

    } catch (error) {
        console.error('GET /api/recipes/following failed:', error);
        res.status(500).send({
            data: {
                errorMessage: 'Could not fetch following recipes'
            }
        });
    }
});

// saved recipes
router.get('/api/recipes/saved', isLoggedIn, async (req, res) => {

    try {
        const recipes = await db.all(`
            SELECT recipes.*, users.name AS author_name,
                (SELECT COUNT(*)
                FROM recipe_likes
                WHERE recipe_id = recipes.id) AS like_count
            FROM recipes
            LEFT JOIN users ON users.id = recipes.user_id
            JOIN recipe_saves ON recipe_saves.recipe_id = recipes.id
            WHERE recipe_saves.user_id = ?
            ORDER BY recipe_saves.created_at DESC`,
            [req.session.user.id]
        );
        res.status(200).send({
            data: { recipes }
        });
    } catch (error) {
        console.error('GET /api/recipes/saved failed:', error);
        res.status(500).send({ data: { errorMessage: 'Could not fetch saved recipes' } });
    }
});

// Get recipe by id
router.get('/api/recipes/:id', isLoggedIn, async (req, res) => {

    const { id } = req.params;
    const currentUserId = req.session.user?.id ?? 0;

    try {
        const recipe = await db.get(`
            SELECT recipes.*, users.name AS author_name, users.avatar_data AS author_avatar,
                (SELECT COUNT(*)
                FROM recipe_likes
                WHERE recipe_id = recipes.id) AS like_count,
                    EXISTS(
                        SELECT 1 FROM recipe_likes
                        WHERE user_id = ? AND recipe_id = recipes.id) AS is_liked,
                    EXISTS(
                        SELECT 1 FROM recipe_saves
                        WHERE user_id = ? AND recipe_id = recipes.id) AS is_saved,
                    EXISTS(
                        SELECT 1
                        FROM follows
                        WHERE follower_id = ? AND followed_id = recipes.user_id) AS is_following
            FROM recipes
            LEFT JOIN users ON users.id = recipes.user_id
            WHERE recipes.id = ?`,
            [currentUserId, currentUserId, currentUserId, id]
        );

        if (!recipe) {
            return res.status(404).send({
                data: { errorMessage: 'Recipe not found' }
            });
        }

        recipe.ingredients = await db.all(`
            SELECT text FROM recipe_ingredients
            WHERE recipe_id = ?
            ORDER BY position`,
            [id]
        );

        recipe.steps = await db.all(`
            SELECT text, timer_seconds FROM recipe_steps
            WHERE recipe_id = ?
            ORDER BY position`,
            [id]
        );

        recipe.comments = await db.all(`
            SELECT recipe_comments.id,
                recipe_comments.text,
                recipe_comments.created_at,
                recipe_comments.user_id,
                users.name AS author_name,
                users.avatar_data AS author_avatar
            FROM recipe_comments
            LEFT JOIN users ON users.id = recipe_comments.user_id
            WHERE recipe_comments.recipe_id = ?
            ORDER BY recipe_comments.created_at ASC`,
            [id]
        );
        res.status(200).send({
            data: { recipe }
        });
    } catch (error) {
        console.error('GET /api/recipes/:id failed:', error);
        res.status(500).send({
            data: { errorMessage: 'Could not fetch recipe' }
        });
    }
});


/* ---------- POST ---------- */

// create recipes
router.post('/api/recipes', isLoggedIn, async (req, res) => {
    const { errorMessage, clean } = validateRecipe(req.body);

    if (errorMessage) {
        return res.status(400).send({ data: { errorMessage } });
    }

    try{
        await db.exec('BEGIN TRANSACTION');
        
        const result = await db.run(`
            INSERT INTO recipes (user_id, title, description, image_data, category, total_minutes, servings, difficulty)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.session.user.id, clean.title, clean.description, clean.imageData,
             clean.category, clean.totalMinutes, clean.servings, clean.difficulty]
        );
        
        const recipeId = result.lastID;
        await insertIngredientsAndSteps(recipeId, clean);

        await db.exec('COMMIT');

        res.status(201).send({
            data: { successMessage: 'Recipe created', recipeId}
        });
    } catch (error) {
        console.error('POST /api/recipes failed:', error);
        try {
            await db.exec('ROLLBACK');
        } catch {}
        return res.status(500).send({
            data: { errorMessage: 'Could not create recipe' }
        });
    }
});

// Save / unsave
router.post('/api/recipes/:id/save', isLoggedIn, async (req, res) => {
    try {
        await db.run(
            `INSERT OR IGNORE INTO recipe_saves (user_id, recipe_id) VALUES (?, ?)`,
            [req.session.user.id, req.params.id]
        );

        res.status(200).send({ data: { successMessage: 'Saved' } });
    } catch (error) {
        console.error('POST /api/recipes/:id/save failed:', error);
        res.status(500).send({ data: { errorMessage: 'Could not save recipe' } });
    }
});


/* ---------- PATCH ---------- */

// update recipes
router.patch('/api/recipes/:id', isLoggedIn, async (req, res) => {
    const recipeId = Number(req.params.id);
    const { errorMessage, clean } = validateRecipe(req.body);

   if (errorMessage) {
        return res.status(400).send({ data: { errorMessage } });
    }

    try {
        const existing = await db.get(`SELECT user_id FROM recipes WHERE id = ?`, [recipeId]);

        if (!existing) {
            return res.status(404).send({
                data: { errorMessage: 'Recipe not found' }
            });
        }

        if (existing.user_id !== req.session.user.id) {
            return res.status(403).send({
                data: { errorMessage: 'You can only edit your own recipes' }
            });
        }

        await db.exec('BEGIN TRANSACTION');

        await db.run(`
            UPDATE recipes SET
                title = ?,
                description = ?,
                image_data = COALESCE(?, image_data),
                category = ?,
                total_minutes = ?,
                servings = ?,
                difficulty = ?
            WHERE id = ?`,
            [clean.title, clean.description, clean.imageData, clean.category,
             clean.totalMinutes, clean.servings, clean.difficulty, recipeId]
        );

        await db.run(`DELETE FROM recipe_ingredients WHERE recipe_id = ?`, [recipeId]);
        await db.run(`DELETE FROM recipe_steps WHERE recipe_id = ?`, [recipeId]);

        await insertIngredientsAndSteps(recipeId, clean);

        await db.exec('COMMIT');

        res.status(200).send({
            data: { successMessage: 'Recipe updated' }
        });
    } catch (error) {
        console.error('PATCH /api/recipes failed:', error);
        try { await db.exec('ROLLBACK'); } catch {}

        return res.status(500).send({
            data: { errorMessage: 'Could not update recipe' }
        });
    }
});

/* ---------- DELETE ---------- */

// delete recipes
router.delete('/api/recipes/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;

    try {
        const recipe = await db.get(`SELECT user_id FROM recipes WHERE id = ?`, [id]);

        if (!recipe) {
            return res.status(404).send({
                data: { errorMessage: 'Recipe not found' }
            });
        }
        if (recipe.user_id !== req.session.user.id) {
            return res.status(403).send({
                data: { errorMessage: 'You can only delete your own recipes' }
            });
        }

        await db.run(`DELETE FROM recipes WHERE id = ?`, [id]);

        res.status(200).send({
            data: { successMessage: 'Recipe deleted' }
        });
    } catch (error) {
        console.error('DELETE /api/recipes/:id failed:', error);
        res.status(500).send({
            data: { errorMessage: 'Could not delete recipe' }
        });
    }
});

// unsave recipe
router.delete('/api/recipes/:id/save', isLoggedIn, async (req, res) => {
    try {
        await db.run(
            `DELETE FROM recipe_saves WHERE user_id = ? AND recipe_id = ?`,
            [req.session.user.id, req.params.id]
        );

        res.status(200).send({ data: { successMessage: 'Removed' } });
    } catch (error) {
        console.error('DELETE /api/recipes/:id/save failed:', error);
        res.status(500).send({ data: { errorMessage: 'Could not remove recipe' } });
    }
});


/* ---------- Helpers ---------- */

// Shared by POST and PATCH — must run inside an open transaction
async function insertIngredientsAndSteps(recipeId, clean) {
    for (let i = 0; i < clean.ingredients.length; i++) {
        await db.run(`
            INSERT INTO recipe_ingredients (recipe_id, position, text)
            VALUES (?, ?, ?)`,
            [recipeId, i + 1, clean.ingredients[i]]
        );
    }

    for (let i = 0; i < clean.steps.length; i++) {
        await db.run(`
            INSERT INTO recipe_steps (recipe_id, position, text, timer_seconds)
            VALUES (?, ?, ?, ?)`,
            [recipeId, i + 1, clean.steps[i].text, clean.steps[i].timerSeconds]
        );
    }
}

export default router;