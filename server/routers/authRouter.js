import { Router } from "express";
import db from '../database/connection.js';
import { compareHashedPasswords, hashPassword } from "../utils/passwordHashing.js";
import { sendConfirmationEmail } from '../utils/emailService.js';

const router = Router();

// register
router.post('/api/auth/register', async (req, res) => {
    const name = req.body.name?.trim();
    const email = req.body.email?.toLowerCase().trim();
    const { password, confirmPassword } = req.body;

    if (( !name || !email || !password || !confirmPassword )) {
        return res.status(400).send({
            data: { errorMessage: "Please fill out all information fields" }
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
        return res.status(400).send({
            data: { errorMessage: "Invalid email format" }
        });
    }

    if (password !== confirmPassword) {
        return res.status(400).send({
            data: { errorMessage: "Passwords do not match" }
        });
    }

    try {
        const existingUser = await db.get(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (existingUser) {
            return res.status(400).send ({
                data: { errorMessage: "Email is already taken" }
            });
        }

        const hashedPassword = await hashPassword(password);

        await db.run(
            `INSERT INTO users (name, email, password) VALUES (?, ?, ?);`,
            [name, email, hashedPassword]
        );
        

    } catch (error) {
        return res.status(500).send({
            data: { errorMessage: "Something went wrong with creating a user"}
        });
    }

    await sendConfirmationEmail (name, email);
    res.status(201).send({
        data: { successMessage: "Account created!" }
    });
});

// Log-in
router.post('/api/auth/login', async (req, res) => {
    const email = req.body.email?.toLowerCase().trim();
    const { password } = req.body;

    if (!email || !password) {
        return res.status(400).send({
            data: { errorMessage: "Please fill out all information fields" }
        });
    }

    try {
        const user = await db.get(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (!user) {
            return res.status(400).send({
                data: { errorMessage: "Invalid credentials" }
            });
        }

        const isPasswordEqual = await compareHashedPasswords(password, user.password);
        if (!isPasswordEqual) {
            return res.status(400).send({
                data: { errorMessage: "Invalid credentials" }
            });
        }

        const { password: _, ...safeUser } = user;
        req.session.user = safeUser;
        res.status(200).send({
            data: { successMessage: "Login successful",
                    user: safeUser
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).send({
            data: { errorMessage: "Something went wrong" }
        });
    }
});

// Log-out
router.post('/api/auth/logout', (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).send({ error: 'Could not log out'});
        }
        res.send({ data: 
            { successMessage: 'Logged out successfully' }
        });
    });
});

export default router;