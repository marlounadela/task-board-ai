import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Normalize DATABASE_URL - Prisma prefers postgresql:// over postgres://
// Update process.env if needed so Prisma can read the normalized URL
const originalDatabaseUrl = process.env.DATABASE_URL;
if (originalDatabaseUrl?.startsWith('postgres://')) {
  process.env.DATABASE_URL = originalDatabaseUrl.replace('postgres://', 'postgresql://');
}

const databaseUrl = process.env.DATABASE_URL;

// Check if DATABASE_URL is set
if (!databaseUrl) {
  console.error(
    "❌ DATABASE_URL is not set in environment variables.\n" +
    "Please add DATABASE_URL to your .env file.\n" +
    "For development (SQLite): DATABASE_URL=\"file:./prisma/dev.db\"\n" +
    "For production (PostgreSQL): DATABASE_URL=\"postgresql://user:password@host:port/database\""
  );
}

// Determine database type from normalized URL
const isPostgreSQL = databaseUrl?.startsWith('postgresql://');
const isSQLite = databaseUrl?.startsWith('file:');

// Create Prisma client with appropriate configuration
// Note: DATABASE_URL is automatically read from process.env by Prisma
// We normalize it above, but Prisma reads directly from env
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ['query', 'error', 'warn'] : ['error'],
});

// Test database connection on initialization
if (!globalForPrisma.prisma) {
  prisma.$connect()
    .then(() => {
      const dbType = isPostgreSQL ? 'PostgreSQL' : isSQLite ? 'SQLite' : 'Unknown';
      console.log(`✅ Database connected successfully (${dbType})`);
      
      // For PostgreSQL, verify connection with a simple query
      if (isPostgreSQL) {
        return prisma.$queryRaw`SELECT 1 as test`
          .then(() => {
            console.log("✅ PostgreSQL connection verified");
          })
          .catch((err) => {
            console.warn("⚠️  PostgreSQL connection test query failed:", err.message);
          });
      }
    })
    .catch((error) => {
      console.error("❌ Failed to connect to database:", error.message);
      
      if (isPostgreSQL) {
        console.error(
          "\nPostgreSQL Connection Troubleshooting:\n" +
          "1. Verify your DATABASE_URL in .env file is correct\n" +
          "2. Check that the database server is accessible and running\n" +
          "3. Verify network connectivity and firewall settings\n" +
          "4. Ensure SSL is properly configured (if required)\n" +
          "5. Check database credentials (username, password)\n" +
          "6. Run: npx prisma migrate deploy (to apply migrations)\n" +
          "7. Run: npx prisma generate (to generate Prisma client)"
        );
      } else if (isSQLite) {
        console.error(
          "\nSQLite Connection Troubleshooting:\n" +
          "1. Check your DATABASE_URL in .env file\n" +
          "2. Make sure the database file exists (for SQLite)\n" +
          "3. Run: npx prisma migrate dev (to create database and run migrations)\n" +
          "4. Run: npx prisma generate (to generate Prisma client)"
        );
      } else {
        console.error(
          "\nTroubleshooting steps:\n" +
          "1. Check your DATABASE_URL in .env file\n" +
          "2. Verify the connection string format\n" +
          "3. Run: npx prisma migrate dev (to create database and run migrations)\n" +
          "4. Run: npx prisma generate (to generate Prisma client)"
        );
      }
    });
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
