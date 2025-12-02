const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkStatus() {
  try {
    console.log('📊 Database Status Check\n');
    
    // Check comments
    const comments = await prisma.comment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });
    
    console.log(`💬 Recent Comments (${comments.length}):`);
    comments.forEach(c => {
      console.log(`  - "${c.content.substring(0, 50)}" by ${c.user.name || c.user.email} (${c.createdAt.toISOString()})`);
    });
    
    // Check notifications
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });
    
    console.log(`\n🔔 Recent Notifications (${notifications.length}):`);
    if (notifications.length === 0) {
      console.log('  (none)');
    } else {
      notifications.forEach(n => {
        console.log(`  - [${n.type}] ${n.message.substring(0, 60)}...`);
        console.log(`    To: ${n.user.name || n.user.email} | Read: ${n.isRead} | ${n.createdAt.toISOString()}`);
      });
    }
    
    // Check users
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true }
    });
    
    console.log(`\n👥 Users (${users.length}):`);
    users.forEach(u => {
      const notifCount = notifications.filter(n => n.userId === u.id).length;
      console.log(`  - ${u.name || 'No name'} (${u.email}) - ${notifCount} notifications`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatus();

