import jwt from 'jsonwebtoken';

// Using a fallback secret for development, but in production, ALWAYS use an environment variable.
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_development_secret_key_123';
const JWT_EXPIRES_IN = '1d';

/**
 * Generates a JSON Web Token for a given user ID.
 */
export const generateToken = (userId: string): string => {
    return jwt.sign({ userId }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
};

/**
 * Verifies a JSON Web Token and returns the decoded payload.
 * Throws an error if the token is invalid or expired.
 */
export const verifyToken = (token: string): any => {
    return jwt.verify(token, JWT_SECRET);
};
