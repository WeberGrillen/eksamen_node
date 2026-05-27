import { Router } from 'express';
import db from '../database/connection.js';
import { isLoggedIn } from '../routers/sessionRouter.js' 

const router = Router();

router.get('/api/recipes', async (req, res) => {
    try {
        const result = await db.all(`
            SELECT * FROM recipes
            ORDER BY created_at DESC`
        );
        res.status(200).send({
            data: result
        });
    } catch (error) {
        res.status(500).send({
            data: { errorMessage: 'Could not fetch recipes', error }}
        );
    }
});

router.get('/api/recipes/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const recipe = await db.get(`
            SELECT * FROM recipes WHERE id = ?`,
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
            data: { errorMessage: 'Could not fetch recipe', error }
        });
    }
});



router.post('/api/recipes', isLoggedIn, async (req, res) => {
    const { title, description, imageData, category, totalMinutes, servings, difficulty, ingredients, steps } = req.body;

    if (!title || !ingredients?.length || !steps?.length) {
        return res.status(400).send({
            data: { errorMessage: 'Title, ingredients and steps are required'}
        });
    }


    try{
        await db.exec('BEGIN TRANSACTION');
        
        const recipeResult = await db.run(`
            INSERT INTO recipes (user_id, title, description, image_data, category, total_minutes, servings, difficulty)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.session.user.id, title, description, imageData, category, totalMinutes, servings, difficulty]
        );
        
        const recipeId = recipeResult.lastID;

        for (let i = 0; i < ingredients.length; i++) {
            await db.run(`
                INSERT INTO recipe_ingredients (recipe_id, position, text)
                VALUES (?, ?, ?)`,
                [recipeId, i + 1, ingredients[i]]
            );
        }

        for (let i = 0; i < steps.length; i++) {
            await db.run(
                `INSERT INTO recipe_steps (recipe_id, position, text, timer_seconds)
                 VALUES (?, ?, ?, ?)`,
                [recipeId, i + 1, steps[i].text, steps[i].timerSeconds ?? null]
            );
        }

        await db.exec('COMMIT');

        res.status(201).send({
            data: { successMessage: 'Recipe created', recipeId}
        });

    } catch (error) {
        try {
            await db.exec('ROLLBACK');
            
        } catch (rollbackError) {
            console.error('Rollback error:', rollbackError);
        }
        res.status(500).send({
            data: { errorMessage: 'Could not create recipe', error}
        });
    }
});


export default router;