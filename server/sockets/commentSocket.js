import db from '../database/connection.js';

export default function commentSocket(io) {
    io.on("connection", (socket) => {

        socket.on("client-sends-comment", async (data) => {
            const user = socket.request.session.user;
            if (!user) return;

            try {

                const recipeId = Number(data.recipeId);
                const text = String(data.text ?? '').trim();

                if (!text || text.length > 500) return;

                const result = await db.run(
                    `INSERT INTO recipe_comments (recipe_id, user_id, text) VALUES (?, ?, ?)`,
                    [recipeId, user.id, text]
                );

                const comment = await db.get(`
                    SELECT c.id, c.text, c.created_at, c.user_id,
                        u.name AS author_name, u.avatar_data AS author_avatar
                    FROM recipe_comments c
                    LEFT JOIN users u ON u.id = c.user_id
                    WHERE c.id = ?`,
                    [result.lastID]
                );

                io.emit("server-sends-comment", { recipeId, comment });

            } catch (error) {
                console.error('socket failed', error);
            }
        });

        socket.on("client-deletes-comment", async (data) => {
            const user = socket.request.session.user;
            if (!user) return;

            try {
                const commentId = Number(data.commentId);

                const existing = await db.get(
                    `SELECT recipe_id, user_id FROM recipe_comments WHERE id = ?`,
                    [commentId]
                );

                if (!existing || existing.user_id !== user.id) return;

                await db.run(`DELETE FROM recipe_comments WHERE id = ?`, [commentId]);

                io.emit("server-deletes-comment", {
                    recipeId: existing.recipe_id,
                    commentId
                });

            } catch (error) {
                console.error('socket failed', error);
            }

            
        });
    });
}