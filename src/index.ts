import 'dotenv/config'; // MUST BE AT THE VERY TOP to load env vars before route requires
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma';

// Import Route Handlers
import authRouter from './routes/auth';
import formsRouter from './routes/forms';
import submissionsRouter from './routes/submissions';

// Import Swagger Setup
import { setupSwagger } from './swaggerConfig';

// Initialize the Express app
const app = express();

// Configure Middleware
app.use(express.json()); // Parse JSON payloads
app.use(cors()); // Allow frontend communication

// Mount Swagger Documentation
setupSwagger(app);

// Mount Application Routes
app.use('/api/auth', authRouter);
app.use('/api/forms', formsRouter);
app.use('/api/submissions', submissionsRouter);

// Basic Health-Check Route
app.get('/', (req: Request, res: Response) => {
    res.status(200).json({ message: 'Form Builder API is running' });
});

// Global Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong on the server.',
    });
});

// Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
