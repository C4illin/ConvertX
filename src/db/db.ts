import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Initialize the database schema using Prisma migrations instead of raw SQL.
// Ensure to run `npx prisma migrate dev` to apply the schema changes.

export default prisma;
