const { PrismaClient } = require('@prisma/client');

async function clearTasks() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🗑️  Starting task cleanup...\n');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully\n');
    
    // Get counts before deletion
    const counts = {
      tasks: await prisma.task.count(),
      subtasks: await prisma.subtask.count(),
      comments: await prisma.comment.count(),
      timeEntries: await prisma.timeEntry.count(),
      taskActivities: await prisma.activity.count({ where: { taskId: { not: null } } }),
      users: await prisma.user.count(),
      boards: await prisma.board.count(),
    };
    
    console.log('📊 Current record counts:');
    console.log(`   - Users: ${counts.users} (will be preserved)`);
    console.log(`   - Boards: ${counts.boards} (will be preserved)`);
    console.log(`   - Tasks: ${counts.tasks} (will be deleted)`);
    console.log(`   - Subtasks: ${counts.subtasks} (will be deleted)`);
    console.log(`   - Comments: ${counts.comments} (will be deleted)`);
    console.log(`   - Time Entries: ${counts.timeEntries} (will be deleted)`);
    console.log(`   - Task-related Activities: ${counts.taskActivities} (will be deleted)\n`);
    
    // Delete in order to respect foreign key constraints
    // Start with child tables and work up to parent tables
    
    console.log('🗑️  Deleting task-related records...\n');
    
    // Delete TimeEntry records (related to tasks)
    const deletedTimeEntries = await prisma.timeEntry.deleteMany({});
    console.log(`✅ Deleted ${deletedTimeEntries.count} time entry records`);
    
    // Delete Comment records (related to tasks)
    const deletedComments = await prisma.comment.deleteMany({});
    console.log(`✅ Deleted ${deletedComments.count} comment records`);
    
    // Delete Subtask records (related to tasks)
    const deletedSubtasks = await prisma.subtask.deleteMany({});
    console.log(`✅ Deleted ${deletedSubtasks.count} subtask records`);
    
    // Delete Activity records that are related to tasks
    const deletedActivities = await prisma.activity.deleteMany({
      where: { taskId: { not: null } }
    });
    console.log(`✅ Deleted ${deletedActivities.count} task-related activity records`);
    
    // Delete Task records (this will cascade delete any remaining related records)
    const deletedTasks = await prisma.task.deleteMany({});
    console.log(`✅ Deleted ${deletedTasks.count} task records`);
    
    // Verify deletion
    console.log('\n🔍 Verifying deletion...\n');
    const finalCounts = {
      tasks: await prisma.task.count(),
      subtasks: await prisma.subtask.count(),
      comments: await prisma.comment.count(),
      timeEntries: await prisma.timeEntry.count(),
      taskActivities: await prisma.activity.count({ where: { taskId: { not: null } } }),
      users: await prisma.user.count(),
      boards: await prisma.board.count(),
    };
    
    console.log('📊 Final record counts:');
    console.log(`   - Users: ${finalCounts.users} ✅ (preserved)`);
    console.log(`   - Boards: ${finalCounts.boards} ✅ (preserved)`);
    console.log(`   - Tasks: ${finalCounts.tasks} ✅ (deleted)`);
    console.log(`   - Subtasks: ${finalCounts.subtasks} ✅ (deleted)`);
    console.log(`   - Comments: ${finalCounts.comments} ✅ (deleted)`);
    console.log(`   - Time Entries: ${finalCounts.timeEntries} ✅ (deleted)`);
    console.log(`   - Task-related Activities: ${finalCounts.taskActivities} ✅ (deleted)`);
    
    const taskRelatedDeleted = finalCounts.tasks === 0 && 
                               finalCounts.subtasks === 0 && 
                               finalCounts.comments === 0 && 
                               finalCounts.timeEntries === 0 &&
                               finalCounts.taskActivities === 0;
    
    if (taskRelatedDeleted && finalCounts.users === counts.users && finalCounts.boards === counts.boards) {
      console.log('\n✅ All tasks and related data have been successfully deleted!');
      console.log('✅ User profiles and boards have been preserved!');
    } else {
      console.log('\n⚠️  Warning: Some records may not have been deleted as expected.');
    }
    
    console.log('\n✨ Task cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during task cleanup:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

clearTasks();











