import 'dotenv/config'; // Make sure env vars are loaded
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Initialize the Prisma Postgres adapter as required by Prisma 7+
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

export const prisma = new PrismaClient({ adapter });
