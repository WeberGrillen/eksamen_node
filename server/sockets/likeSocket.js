import db from '../database/connection.js';

export default function likeSocket(io) {
    io.on("connection", (socket) => {

        socket.on("client-toggles-like", async (data) => {
            const user = socket.request.session.user;
            if (!user) return;

            const recipeId = Number(data.recipeId);

            const existing = await db.get(
                `SELECT 1 FROM recipe_likes WHERE user_id = ? AND recipe_id = ?`,
                [user.id, recipeId]
            );

            if (existing) {
                await db.run(
                    `DELETE FROM recipe_likes WHERE user_id = ? AND recipe_id = ?`,
                    [user.id, recipeId]
                );
            } else {
                await db.run(
                    `INSERT OR IGNORE INTO recipe_likes (user_id, recipe_id) VALUES (?, ?)`,
                    [user.id, recipeId]
                );
            }

            const { count } = await db.get(
                `SELECT COUNT(*) AS count FROM recipe_likes WHERE recipe_id = ?`,
                [recipeId]
            );

            io.emit("server-sends-like-count", { recipeId, count });
            socket.emit("server-sends-like-state", { recipeId, liked: !existing });
        });
    });
}