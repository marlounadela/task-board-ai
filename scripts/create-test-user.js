const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Creating test user...\n');
    
    // Hash password
    const hashedPassword = await bcrypt.hash('testpassword123', 12);
    
    // Create test user
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        emailVerified: new Date(),
      }
    });
    
    console.log('✅ Test user created successfully!');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: Hashed (${user.password.length} characters)`);
    console.log(`   Created: ${user.createdAt.toISOString()}`);
    
    // Create another test user
    const user2 = await prisma.user.create({
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        password: await bcrypt.hash('password123', 12),
      }
    });
    
    console.log('\n✅ Second test user created!');
    console.log(`   ID: ${user2.id}`);
    console.log(`   Name: ${user2.name}`);
    console.log(`   Email: ${user2.email}`);
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('⚠️  User already exists, skipping creation...');
    } else {
      console.error('❌ Error creating test user:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
