const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Get user count
    const userCount = await prisma.user.count();
    console.log(`📊 Total users in database: ${userCount}`);
    
    // Get all users (without passwords for security)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('\n👥 Users in database:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'No name'} (${user.email}) - Created: ${user.createdAt.toISOString()}`);
    });
    
    // Check for users with passwords
    const usersWithPasswords = await prisma.user.findMany({
      where: {
        password: {
          not: null
        }
      },
      select: {
        email: true,
        name: true
      }
    });
    
    console.log(`\n🔐 Users with passwords: ${usersWithPasswords.length}`);
    usersWithPasswords.forEach(user => {
      console.log(`- ${user.name || 'No name'} (${user.email})`);
    });
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
