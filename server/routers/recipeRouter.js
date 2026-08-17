import { Router } from 'express';
import db from '../database/connection.js';
import { isLoggedIn } from '../routers/sessionRouter.js' 

const router = Router();

router.get('/api/recipes', async (req, res) => {
    try {
        const result = await db.all(`
            SELECT r.*, u.name AS author_name
            FROM recipes r
            LEFT JOIN users u ON u.id = r.user_id
            ORDER BY r.created_at DESC
        `);
        res.status(200).send({
            data: { recipes: result}
        });
    } catch (error) {
        res.status(500).send({
            data: { errorMessage: 'Could not fetch recipes' }
        });
    }
});

router.get('/api/recipes/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const recipe = await db.get(`
            SELECT r.*, u.name AS author_name
            FROM recipes r
            LEFT JOIN users u ON u.id = r.user_id
            WHERE r.id = ?`,
            [id]
        );

        if (!recipe) {
            return res.status(404).send({
                data: { errorMessage: 'Recipe not found' }
            });
        }

        const ingredients = await db.all(`
            SELECT text FROM recipe_ingredients
            WHERE recipe_id = ?
            ORDER BY position`,
            [id]
        );

        const steps = await db.all(`
            SELECT text, timer_seconds FROM recipe_steps
            WHERE recipe_id = ?
            ORDER BY position`,
            [id]
        );

        recipe.ingredients = ingredients;
        recipe.steps = steps;

        res.status(200).send({
            data: { recipe }
        });

    } catch (error) {
        res.status(500).send({
            data: { errorMessage: 'Could not fetch recipe' }
        });
    }
});

router.post('/api/recipes', isLoggedIn, async (req, res) => {
    const { title, description, imageData, category, totalMinutes, servings, difficulty, ingredients, steps } = req.body;

    const cleanIngredients = (Array.isArray(ingredients) ? ingredients : [])
        .map((text) => String(text ?? '').trim())
        .filter((text) => text !== '');

    const cleanSteps = (Array.isArray(steps) ? steps : [])
        .filter((step) => step?.text?.trim())
        .map((step) => ({ text: step.text.trim(), timerSeconds: step.timerSeconds ?? null }));

    if (!title?.trim()) {
        return res.status(400).send({
            data: { errorMessage: "Title is required" }
        });
    }

    if (cleanIngredients.length === 0) {
        return res.status(400).send({
            data: { errorMessage: "At least one ingredient is required" }
        });
    }

    if (cleanSteps.length === 0) {
        return res.status(400).send({
            data: { errorMessage: "At least one step is required" }
        });
    }

    const MAX_IMAGE_CHARS= 2_000_000;

    if (imageData) {
        if (typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
            return res.status(400).send({
                data: { errorMessage: "Invaild image"}  
            });
        }
        if (imageData.length > MAX_IMAGE_CHARS) {
            return res.status(400).send({
                data: { errorMessage: "Image is too large"}
            });
        }
    }
    console.log('category:', JSON.stringify(req.body.category));

    try{
        await db.exec('BEGIN TRANSACTION');
        
        
        const recipeResult = await db.run(`
            INSERT INTO recipes (user_id, title, description, image_data, category, total_minutes, servings, difficulty)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.session.user.id, title.trim(), description ?? null, imageData ?? null,
             category ?? null, totalMinutes ?? null, servings ?? null, difficulty ?? null]
        );
        
        const recipeId = recipeResult.lastID;

        for (let i = 0; i < cleanIngredients.length; i++) {
            await db.run(`
                INSERT INTO recipe_ingredients (recipe_id, position, text)
                VALUES (?, ?, ?)`,
                [recipeId, i + 1, ingredients[i]]
            );
        }

        for (let i = 0; i < cleanSteps.length; i++) {
            await db.run(
                `INSERT INTO recipe_steps (recipe_id, position, text, timer_seconds)
                 VALUES (?, ?, ?, ?)`,
                [recipeId, i + 1, steps[i]?.text, steps[i].timerSeconds ?? null]
            );
        }

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
        console.log(error);
        res.status(500).send({
            data: { errorMessage: 'Could not delete recipe' }
        });
    }
});


export default router;