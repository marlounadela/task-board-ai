const { PrismaClient } = require('@prisma/client');

async function queryAllUsers() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Querying all users from database...\n');
    
    // Get all users with their login information
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        // Include password info for verification
        password: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 Found ${users.length} users in the database:\n`);
    
    if (users.length === 0) {
      console.log('❌ No users found in the database.');
      console.log('💡 Try creating a user account first through the signup page.');
      return;
    }
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. User Details:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.name || 'No name provided'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Email Verified: ${user.emailVerified ? 'Yes' : 'No'}`);
      console.log(`   Has Password: ${user.password ? 'Yes' : 'No'}`);
      if (user.password) {
        console.log(`   Password Hash Length: ${user.password.length} characters`);
      }
      console.log(`   Created: ${user.createdAt.toISOString()}`);
      console.log(`   Last Updated: ${user.updatedAt.toISOString()}`);
      console.log(`   Profile Image: ${user.image ? 'Yes' : 'No'}`);
      console.log('   ' + '─'.repeat(50));
    });
    
    // Summary statistics
    const usersWithPasswords = users.filter(u => u.password).length;
    const verifiedUsers = users.filter(u => u.emailVerified).length;
    
    console.log('\n📈 Summary Statistics:');
    console.log(`   Total Users: ${users.length}`);
    console.log(`   Users with Passwords: ${usersWithPasswords}`);
    console.log(`   Verified Users: ${verifiedUsers}`);
    console.log(`   Users without Passwords: ${users.length - usersWithPasswords}`);
    
  } catch (error) {
    console.error('❌ Error querying database:', error.message);
    
    if (error.code === 'P1001') {
      console.log('\n💡 Database connection failed. Please check:');
      console.log('   1. Your DATABASE_URL in .env file');
      console.log('   2. Database server is running');
      console.log('   3. Network connectivity');
    }
  } finally {
    await prisma.$disconnect();
  }
}

queryAllUsers();
