import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, name } = req.body;

        // Basic validation
        if (!email || !password || !name) {
            res.status(400).json({ error: 'Email, password, and name are required.' });
            return;
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            res.status(400).json({ error: 'User with this email already exists.' });
            return;
        }

        // Hash the password
        const hashedPassword = await hashPassword(password);

        // Create the user
        const newUser = await prisma.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
            },
            select: {
                id: true,
                email: true,
                name: true,
            } // Exclude password from the response
        });

        // Generate JWT token
        const token = generateToken(newUser.id);

        res.status(201).json({
            message: 'User registered successfully',
            user: newUser,
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error during registration.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required.' });
            return;
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            res.status(401).json({ error: 'Invalid credentials.' });
            return;
        }

        // Compare passwords
        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
            res.status(401).json({ error: 'Invalid credentials.' });
            return;
        }

        // Generate token
        const token = generateToken(user.id);

        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error during login.' });
    }
});

export default router;
