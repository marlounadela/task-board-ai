const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCommentNotification() {
  try {
    console.log('🧪 Testing full comment notification flow...\n');
    
    // Get users
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true },
    });
    
    if (users.length < 2) {
      console.error('❌ Need at least 2 users for testing');
      return;
    }
    
    const user01 = users.find(u => u.name === 'User_01') || users[0];
    const user02 = users.find(u => u.name === 'User_02') || users[1];
    
    console.log(`👤 Commenter: ${user01.name} (${user01.id})`);
    console.log(`👤 Mentioned User: ${user02.name} (${user02.id})\n`);
    
    // Get a task (create one if none exists)
    let task = await prisma.task.findFirst({
      include: { board: true },
    });
    
    if (!task) {
      console.log('📋 No tasks found, creating a test task...');
      const board = await prisma.board.findFirst();
      if (!board) {
        console.error('❌ No boards found. Please create a board first.');
        return;
      }
      
      task = await prisma.task.create({
        data: {
          title: 'Test Task for Notifications',
          boardId: board.id,
          status: 'todo',
          labels: '',
        },
        include: { board: true },
      });
      console.log(`✅ Created test task: ${task.id}`);
    } else {
      console.log(`📋 Using existing task: "${task.title}" (${task.id})`);
    }
    
    // Test comment content
    const commentContent = '@User_02 testing please get notified';
    console.log(`\n💬 Test comment: "${commentContent}"`);
    
    // Extract mentions
    const mentionRegex = /@([^\s,@]+)/g;
    const mentions = [];
    let match;
    mentionRegex.lastIndex = 0;
    
    while ((match = mentionRegex.exec(commentContent)) !== null) {
      const mentionedText = match[1].trim();
      if (mentionedText) {
        mentions.push(mentionedText);
      }
    }
    
    console.log(`📝 Mentions extracted:`, mentions);
    
    // Simulate the matching logic
    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true },
    });
    
    const normalizeForMatching = (text) => {
      return text.toLowerCase().replace(/[\s_\-]/g, '');
    };
    
    for (const mention of mentions) {
      const mentionLower = mention.toLowerCase().trim();
      console.log(`\n🔍 Looking for user matching: "${mention}"`);
      
      let mentionedUser = null;
      
      for (const user of allUsers) {
        const userName = (user.name || "").trim().toLowerCase();
        const userEmail = user.email.trim().toLowerCase();
        const normalizedMention = normalizeForMatching(mention);
        const normalizedUserName = normalizeForMatching(userName);
        
        // Check exact match
        if (userName && userName === mentionLower) {
          mentionedUser = user;
          console.log(`  ✅ Found exact match: ${user.name} (${user.id})`);
          break;
        }
        
        // Check normalized match
        if (userName && normalizedMention === normalizedUserName) {
          mentionedUser = user;
          console.log(`  ✅ Found normalized match: ${user.name} (${user.id})`);
          break;
        }
      }
      
      if (!mentionedUser) {
        console.log(`  ❌ No user found matching "${mention}"`);
        continue;
      }
      
      // Try to create notification
      console.log(`\n🔔 Attempting to create notification...`);
      try {
        const notification = await prisma.notification.create({
          data: {
            type: 'mention',
            message: `${user01.name || user01.email} mentioned you in a comment on "${task.title}"`,
            userId: mentionedUser.id,
            taskId: task.id,
            boardId: task.boardId,
          },
        });
        
        console.log(`  ✅ Notification created successfully!`);
        console.log(`     ID: ${notification.id}`);
        console.log(`     Type: ${notification.type}`);
        console.log(`     Message: ${notification.message}`);
        console.log(`     User ID: ${notification.userId}`);
        console.log(`     Is Read: ${notification.isRead}`);
        
        // Verify it can be retrieved
        const retrieved = await prisma.notification.findUnique({
          where: { id: notification.id },
        });
        
        if (retrieved) {
          console.log(`\n✅ Notification can be retrieved from database`);
        } else {
          console.log(`\n❌ Notification cannot be retrieved!`);
        }
        
        // Clean up - delete the test notification
        await prisma.notification.delete({
          where: { id: notification.id },
        });
        console.log(`\n🧹 Test notification deleted`);
        
      } catch (error) {
        console.error(`  ❌ Error creating notification:`, error);
        console.error(`     Error message:`, error.message);
        console.error(`     Error code:`, error.code);
      }
    }
    
    // Check final notification count
    const notificationCount = await prisma.notification.count({
      where: { userId: user02.id },
    });
    console.log(`\n📊 Total notifications for ${user02.name}: ${notificationCount}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testCommentNotification();

