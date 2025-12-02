const { PrismaClient } = require('@prisma/client');

async function clearAllData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🗑️  Starting database cleanup...\n');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully\n');
    
    // Get counts before deletion
    const counts = {
      notifications: await prisma.notification.count(),
      activities: await prisma.activity.count(),
      timeEntries: await prisma.timeEntry.count(),
      comments: await prisma.comment.count(),
      subtasks: await prisma.subtask.count(),
      tasks: await prisma.task.count(),
      boards: await prisma.board.count(),
      accounts: await prisma.account.count(),
      sessions: await prisma.session.count(),
      users: await prisma.user.count(),
    };
    
    console.log('📊 Current record counts:');
    console.log(`   - Users: ${counts.users}`);
    console.log(`   - Accounts: ${counts.accounts}`);
    console.log(`   - Sessions: ${counts.sessions}`);
    console.log(`   - Boards: ${counts.boards}`);
    console.log(`   - Tasks: ${counts.tasks}`);
    console.log(`   - Subtasks: ${counts.subtasks}`);
    console.log(`   - Comments: ${counts.comments}`);
    console.log(`   - Time Entries: ${counts.timeEntries}`);
    console.log(`   - Activities: ${counts.activities}`);
    console.log(`   - Notifications: ${counts.notifications}\n`);
    
    // Delete in order to respect foreign key constraints
    // Start with child tables and work up to parent tables
    
    console.log('🗑️  Deleting records...\n');
    
    // Delete Notification records
    const deletedNotifications = await prisma.notification.deleteMany({});
    console.log(`✅ Deleted ${deletedNotifications.count} notification records`);
    
    // Delete Activity records
    const deletedActivities = await prisma.activity.deleteMany({});
    console.log(`✅ Deleted ${deletedActivities.count} activity records`);
    
    // Delete TimeEntry records
    const deletedTimeEntries = await prisma.timeEntry.deleteMany({});
    console.log(`✅ Deleted ${deletedTimeEntries.count} time entry records`);
    
    // Delete Comment records
    const deletedComments = await prisma.comment.deleteMany({});
    console.log(`✅ Deleted ${deletedComments.count} comment records`);
    
    // Delete Subtask records
    const deletedSubtasks = await prisma.subtask.deleteMany({});
    console.log(`✅ Deleted ${deletedSubtasks.count} subtask records`);
    
    // Delete Task records
    const deletedTasks = await prisma.task.deleteMany({});
    console.log(`✅ Deleted ${deletedTasks.count} task records`);
    
    // Delete Board records
    const deletedBoards = await prisma.board.deleteMany({});
    console.log(`✅ Deleted ${deletedBoards.count} board records`);
    
    // Delete Account records
    const deletedAccounts = await prisma.account.deleteMany({});
    console.log(`✅ Deleted ${deletedAccounts.count} account records`);
    
    // Delete Session records
    const deletedSessions = await prisma.session.deleteMany({});
    console.log(`✅ Deleted ${deletedSessions.count} session records`);
    
    // Delete User records (this will cascade delete related records if not already deleted)
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`✅ Deleted ${deletedUsers.count} user records`);
    
    // Verify all records are deleted
    console.log('\n🔍 Verifying deletion...\n');
    const finalCounts = {
      notifications: await prisma.notification.count(),
      activities: await prisma.activity.count(),
      timeEntries: await prisma.timeEntry.count(),
      comments: await prisma.comment.count(),
      subtasks: await prisma.subtask.count(),
      tasks: await prisma.task.count(),
      boards: await prisma.board.count(),
      accounts: await prisma.account.count(),
      sessions: await prisma.session.count(),
      users: await prisma.user.count(),
    };
    
    const totalRemaining = Object.values(finalCounts).reduce((sum, count) => sum + count, 0);
    
    if (totalRemaining === 0) {
      console.log('✅ All records have been successfully deleted!');
      console.log('📊 Final counts: All tables are empty');
    } else {
      console.log('⚠️  Warning: Some records may still exist:');
      Object.entries(finalCounts).forEach(([table, count]) => {
        if (count > 0) {
          console.log(`   - ${table}: ${count} records remaining`);
        }
      });
    }
    
    console.log('\n✨ Database cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during database cleanup:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllData();

