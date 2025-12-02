const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNotificationDirect() {
  try {
    console.log('🧪 Testing direct notification creation...\n');
    
    // Get User_02
    const user02 = await prisma.user.findFirst({
      where: { name: 'User_02' },
    });
    
    if (!user02) {
      console.error('❌ User_02 not found');
      return;
    }
    
    console.log(`👤 User: ${user02.name} (${user02.id})\n`);
    
    // Get a task
    const task = await prisma.task.findFirst();
    if (!task) {
      console.error('❌ No tasks found');
      return;
    }
    
    console.log(`📋 Task: "${task.title}" (${task.id})\n`);
    
    // Try to create notification directly
    console.log('🔔 Creating notification directly...');
    
    const notification = await prisma.notification.create({
      data: {
        type: 'mention',
        message: 'User_01 mentioned you in a comment on "Task_01"',
        userId: user02.id,
        taskId: task.id,
        boardId: task.boardId,
      },
    });
    
    console.log('✅ Notification created!');
    console.log(`   ID: ${notification.id}`);
    console.log(`   Type: ${notification.type}`);
    console.log(`   User ID: ${notification.userId}`);
    console.log(`   Message: ${notification.message}`);
    console.log(`   Is Read: ${notification.isRead}\n`);
    
    // Verify retrieval
    const retrieved = await prisma.notification.findUnique({
      where: { id: notification.id },
    });
    
    console.log(retrieved ? '✅ Notification can be retrieved' : '❌ Notification cannot be retrieved');
    
    // Get count for user
    const count = await prisma.notification.count({
      where: { userId: user02.id, isRead: false },
    });
    
    console.log(`\n📊 Unread notifications for ${user02.name}: ${count}`);
    
    // Keep notification for testing (don't delete)
    console.log('\n💾 Notification kept in database for testing');
    
  } catch (error) {
    console.error('❌ Error:', error);
    if (error.meta) {
      console.error('   Meta:', error.meta);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testNotificationDirect();

