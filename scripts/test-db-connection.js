#!/usr/bin/env node

/**
 * Test database connection script
 * Run with: node scripts/test-db-connection.js
 * 
 * This script tests the database connection using the DATABASE_URL from .env
 * Note: Next.js automatically loads .env files. For standalone scripts, ensure
 * DATABASE_URL is set in your environment or .env file.
 */

// Try to load dotenv if available (for standalone script execution)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed, that's OK - Next.js will load .env automatically
}

const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  console.log('🔍 Testing database connection...\n');
  
  // Check if DATABASE_URL is set
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set in environment variables.');
    console.error('\nPlease add DATABASE_URL to your .env file:');
    console.error('  For PostgreSQL: DATABASE_URL="postgresql://user:password@host:port/database"');
    console.error('  For SQLite: DATABASE_URL="file:./prisma/dev.db"');
    process.exit(1);
  }
  
  // Normalize postgres:// to postgresql://
  const normalizedUrl = databaseUrl.startsWith('postgres://') 
    ? databaseUrl.replace('postgres://', 'postgresql://')
    : databaseUrl;
  
  if (normalizedUrl !== databaseUrl) {
    console.log('ℹ️  Normalized connection string: postgres:// → postgresql://');
  }
  
  // Determine database type
  const isPostgreSQL = normalizedUrl.startsWith('postgresql://');
  const isSQLite = normalizedUrl.startsWith('file:');
  
  console.log(`📊 Database Type: ${isPostgreSQL ? 'PostgreSQL' : isSQLite ? 'SQLite' : 'Unknown'}`);
  console.log(`🔗 Connection String: ${normalizedUrl.substring(0, 50)}...`);
  console.log('');
  
  const prisma = new PrismaClient({
    log: ['error'],
  });
  
  try {
    // Test connection
    console.log('1️⃣  Testing connection...');
    await prisma.$connect();
    console.log('   ✅ Connected successfully');
    
    // For PostgreSQL, test with a query
    if (isPostgreSQL) {
      console.log('\n2️⃣  Testing PostgreSQL query...');
      const result = await prisma.$queryRaw`SELECT version() as version, current_database() as database`;
      if (result && result.length > 0) {
        console.log(`   ✅ PostgreSQL version: ${result[0].version?.substring(0, 50)}...`);
        console.log(`   ✅ Database name: ${result[0].database}`);
      }
    }
    
    // Test basic query
    console.log('\n3️⃣  Testing basic query...');
    const userCount = await prisma.user.count();
    console.log(`   ✅ User count: ${userCount}`);
    
    // Test schema access (PostgreSQL only)
    if (isPostgreSQL) {
      console.log('\n4️⃣  Testing schema access...');
      try {
        const tables = await prisma.$queryRaw`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          LIMIT 5
        `;
        if (tables && Array.isArray(tables)) {
          console.log(`   ✅ Found ${tables.length} tables in database`);
        }
      } catch (err) {
        console.log('   ⚠️  Could not query table list (this is OK)');
      }
    }
    
    console.log('\n✅ All connection tests passed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run: npx prisma migrate deploy (to apply migrations)');
    console.log('   2. Run: npx prisma generate (to generate Prisma client)');
    console.log('   3. Restart your development server');
    
  } catch (error) {
    console.error('\n❌ Connection test failed!');
    console.error(`\nError: ${error.message}`);
    
    if (isPostgreSQL) {
      console.error('\nPostgreSQL Troubleshooting:');
      console.error('  1. Verify DATABASE_URL is correct');
      console.error('  2. Check network connectivity');
      console.error('  3. Verify SSL settings (sslmode=require)');
      console.error('  4. Check firewall rules');
      console.error('  5. Verify credentials');
    } else {
      console.error('\nTroubleshooting:');
      console.error('  1. Verify DATABASE_URL is correct');
      console.error('  2. Check file permissions (for SQLite)');
      console.error('  3. Run: npx prisma migrate dev');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

