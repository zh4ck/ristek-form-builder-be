import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

// Extend Express Request interface to include a user property
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];

    // Format should be: "Bearer <token>"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: 'Access denied. No token provided.' });
        return;
    }

    try {
        const decoded = verifyToken(token);
        req.user = decoded; // Contains { userId: string } payload from generating token
        next();
    } catch (error) {
        res.status(403).json({ error: 'Invalid or expired token.' });
    }
};
