import { Router } from 'express';
import { isLoggedIn } from './sessionRouter.js';
import db from '../database/connection.js';

const router = Router();

router.get('/api/users', isLoggedIn, async (req, res) => {

    const currentUserId = req.session.user?.id ?? 0;

    try {
        const users = await db.all(`
            SELECT u.id, u.name, u.bio, u.avatar_data,
                   (SELECT COUNT(*) FROM recipes WHERE user_id = u.id) AS recipe_count,
                   (SELECT COUNT(*) FROM follows WHERE followed_id = u.id) AS follower_count,
                   EXISTS(SELECT 1 FROM follows
                          WHERE follower_id = ? AND followed_id = u.id) AS is_following
            FROM users u
            WHERE u.id != ?
            ORDER BY follower_count DESC`,
            [currentUserId, currentUserId]
        );

        res.status(200).send({ data: { users } });
    } catch (error) {
        console.log(error);
        res.status(500).send({ data: { errorMessage: 'Could not fetch users' } });
    }
});

router.get('/api/users/:id/profile', isLoggedIn, async (req, res) => {

    const { id } = req.params;
    const currentUserId = req.session.user?.id ?? 0;
    
    try {
        const profile = await db.get(`
            SELECT u.id, u.name, u.bio, u.avatar_data, u.banner_data,
                EXISTS(SELECT 1 FROM follows
                        WHERE follower_id = ? AND followed_id = u.id) AS is_following
            FROM users u
            WHERE u.id = ?`,
            [currentUserId, id]
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

router.post('/api/users/:id/follow', isLoggedIn, async (req, res) => {
    const followedId = Number(req.params.id);
    const followerId = req.session.user.id;

    if (followedId === followerId) {
        return res.status(400).send({ data: { errorMessage: 'You cannot follow yourself' } });
    }

    try {
        await db.run(
            `INSERT OR IGNORE INTO follows (follower_id, followed_id) VALUES (?, ?)`,
            [followerId, followedId]
        );
        res.status(200).send({ data: { successMessage: 'Following' } });
    } catch (error) {
        console.log(error);
        res.status(500).send({ data: { errorMessage: 'Could not follow user' } });
    }
});


router.patch('/api/users/me', isLoggedIn, async (req, res) => {
    const { bio, avatarData, bannerData } = req.body;

    if (bio && bio.length > 300) {
        return res.status(400).send({ data: { errorMessage: 'Bio is too long' } });
    }

    for (const image of [avatarData, bannerData]) {
        if (image && (typeof image !== 'string' || !image.startsWith('data:image/'))) {
            return res.status(400).send({ data: { errorMessage: 'Invalid image' } });
        }
        if (image && image.length > 2_000_000) {
            return res.status(400).send({ data: { errorMessage: 'Image is too large' } });
        }
    }

    try {
        await db.run(`
            UPDATE users SET
                bio = COALESCE(?, bio),
                avatar_data = COALESCE(?, avatar_data),
                banner_data = COALESCE(?, banner_data)
            WHERE id = ?`,
            [bio ?? null, avatarData ?? null, bannerData ?? null, req.session.user.id]
        );

        res.status(200).send({ data: { successMessage: 'Profile updated' } });
    } catch (error) {
        console.log(error);
        res.status(500).send({ data: { errorMessage: 'Could not update profile' } });
    }
});

router.delete('/api/users/:id/follow', isLoggedIn, async (req, res) => {
    try {
        await db.run(
            `DELETE FROM follows WHERE follower_id = ? AND followed_id = ?`,
            [req.session.user.id, req.params.id]
        );
        res.status(200).send({ data: { successMessage: 'Unfollowed' } });
    } catch (error) {
        console.log(error);
        res.status(500).send({ data: { errorMessage: 'Could not unfollow user' } });
    }
});

export default router;