import { Router } from 'express';
import db from '../database/connection.js';
import { isLoggedIn } from '../routers/sessionRouter.js' 
import { validateRecipe } from '../utils/recipeValidation.js';

const router = Router();

/* ---------- GET ---------- */

// get all recipes
router.get('/api/recipes', isLoggedIn, async (req, res) => {
    try {
        const result = await db.all(`
            SELECT r.*, u.name AS author_name,
                (SELECT COUNT(*) FROM recipe_likes WHERE recipe_id = r.id) AS like_count
            FROM recipes r
            LEFT JOIN users u ON u.id = r.user_id
            ORDER BY r.created_at DESC
        `);
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
            SELECT r.*, u.name AS author_name,
                COUNT(l.recipe_id) AS recent_likes,
                (SELECT COUNT(*) FROM recipe_likes WHERE recipe_id = r.id) AS like_count,
                EXISTS(SELECT 1 FROM recipe_likes
                    WHERE user_id = ? AND recipe_id = r.id) AS is_liked
            FROM recipes r
            LEFT JOIN users u ON u.id = r.user_id
            JOIN recipe_likes l ON l.recipe_id = r.id
            WHERE l.created_at >= datetime('now', '-7 days')
            GROUP BY r.id
            ORDER BY recent_likes DESC, r.created_at DESC
            LIMIT 6`,
            [currentUserId]
        );

        res.status(200).send({ data: { recipes } });
    } catch (error) {
        console.error('GET /api/recipes/trending failed:', error);
        res.status(500).send({ data: { errorMessage: 'Could not fetch trending recipes' } });
    }
});

// saved recipes
router.get('/api/recipes/saved', isLoggedIn, async (req, res) => {

    try {
        const recipes = await db.all(`
            SELECT r.*, u.name AS author_name,
                   (SELECT COUNT(*) FROM recipe_likes WHERE recipe_id = r.id) AS like_count
            FROM recipes r
            LEFT JOIN users u ON u.id = r.user_id
            JOIN recipe_saves s ON s.recipe_id = r.id
            WHERE s.user_id = ?
            ORDER BY s.created_at DESC`,
            [req.session.user.id]
        );

        res.status(200).send({ data: { recipes } });
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
            SELECT r.*, u.name AS author_name,
                (SELECT COUNT(*) FROM recipe_likes WHERE recipe_id = r.id) AS like_count,
                EXISTS(SELECT 1 FROM recipe_likes
                    WHERE user_id = ? AND recipe_id = r.id) AS is_liked,
                EXISTS(SELECT 1 FROM recipe_saves
                    WHERE user_id = ? AND recipe_id = r.id) AS is_saved
            FROM recipes r
            LEFT JOIN users u ON u.id = r.user_id
            WHERE r.id = ?`,
            [currentUserId, currentUserId, id]
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
        try { await db.exec('ROLLBACK'); } catch {}
       
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