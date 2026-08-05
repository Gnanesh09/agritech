import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

// 1. Set up the standard pg Pool
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

// 2. Initialize the Prisma Postgres Adapter
const adapter = new PrismaPg(pool);

declare global {
  var prisma: PrismaClient | undefined;
}

// 3. Pass the adapter to the PrismaClient constructor
export const prisma = global.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// 4. Verification function
export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log("🐘 PostgreSQL (Supabase) connected via Prisma pg Adapter");
  } catch (error) {
    console.error("Prisma connection error: ", error);
    process.exit(1);
  }
};

export default connectDB;