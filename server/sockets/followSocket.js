import db from '../database/connection.js';

export default function followSocket(io) {
    io.on("connection", (socket) => {

        socket.on("client-toggles-follow", async (data) => {
            const user = socket.request.session.user;
            if (!user) return;

            const followedId = Number(data.userId);
            if (followedId === user.id) return;

            const existing = await db.get(
                `SELECT 1 FROM follows WHERE follower_id = ? AND followed_id = ?`,
                [user.id, followedId]
            );

            if (existing) {
                await db.run(
                    `DELETE FROM follows WHERE follower_id = ? AND followed_id = ?`,
                    [user.id, followedId]
                );
            } else {
                await db.run(
                    `INSERT OR IGNORE INTO follows (follower_id, followed_id) VALUES (?, ?)`,
                    [user.id, followedId]
                );
            }

            const { count } = await db.get(
                `SELECT COUNT(*) AS count FROM follows WHERE followed_id = ?`,
                [followedId]
            );

            io.emit("server-sends-follower-count", { userId: followedId, count });
            socket.emit("server-sends-follow-state", { userId: followedId, following: !existing });
        });
    });
}