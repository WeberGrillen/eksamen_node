import { router } from 'express';
import db from '../database/connection.js';

const router = Router();

router.get('/api/users/:id/profile', async (req, res) => {
    const { id } = req.params;

    try {
        const profile = await db.get(`
            SELECT id, name, bio, avatar_data, banner_data
            FROM users WHERE id = ?`,
            [id]
        );

        if (!profile) {
            return res.status(404).send({
                data: { errorMessage: 'User not found' }
            });
        }

        const recipeSelect = `
            SELECT r.*, u.name AS author_name,
                   (SELECT COUNT(*) FROM recipe_likes WHERE recipe_id = r.id) AS like_count
            FROM recipes r
            LEFT JOIN users u ON u.id = r.user_id`;

        const recipes = await db.all(
            `${recipeSelect} WHERE r.user_id = ? ORDER BY r.created_at DESC`, [id]);

        const saved = await db.all(
            `${recipeSelect}
             JOIN recipe_saves s ON s.recipe_id = r.id
             WHERE s.user_id = ? ORDER BY s.created_at DESC`, [id]);

        const liked = await db.all(
            `${recipeSelect}
             JOIN recipe_likes l ON l.recipe_id = r.id
             WHERE l.user_id = ? ORDER BY l.created_at DESC`, [id]);

        const counts = await db.get(`
            SELECT
              (SELECT COUNT(*) FROM follows WHERE followed_id = ?) AS followers,
              (SELECT COUNT(*) FROM follows WHERE follower_id = ?) AS following`,
            [id, id]
        );

        res.status(200).send({
            data: { profile, recipes, saved, liked, counts }
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({
            data: { errorMessage: 'Could not fetch profile' }
        });
    }
});

export default router;