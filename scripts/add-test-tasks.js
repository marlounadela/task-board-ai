import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addTestTasks() {
  try {
    // Get all users
    const users = await prisma.user.findMany();
    
    if (users.length === 0) {
      console.log('No users found. Please create a user first.');
      return;
    }

    const user = users[0];
    console.log(`Adding test tasks for user: ${user.email}`);

    // Get all boards for the user
    const boards = await prisma.board.findMany({
      where: { 
        userId: user.id,
        isArchived: false 
      }
    });

    if (boards.length === 0) {
      console.log('No boards found. Creating default boards...');
      
      // Create main and review boards
      const mainBoard = await prisma.board.create({
        data: {
          name: 'Main Board',
          userId: user.id,
        }
      });
      
      const reviewBoard = await prisma.board.create({
        data: {
          name: 'Review Board',
          userId: user.id,
        }
      });

      boards.push(mainBoard, reviewBoard);
    }

    console.log(`Found ${boards.length} boards`);

    // Task templates
    const taskTemplates = [
      { title: 'Setup project repository', status: 'done', priority: 'high' },
      { title: 'Configure CI/CD pipeline', status: 'done', priority: 'high' },
      { title: 'Design database schema', status: 'in-progress', priority: 'high' },
      { title: 'Implement authentication', status: 'in-progress', priority: 'high' },
      { title: 'Create user management API', status: 'todo', priority: 'medium' },
      { title: 'Build task creation feature', status: 'todo', priority: 'medium' },
      { title: 'Add drag and drop functionality', status: 'todo', priority: 'medium' },
      { title: 'Implement comments system', status: 'todo', priority: 'low' },
      { title: 'Add file upload feature', status: 'todo', priority: 'low' },
      { title: 'Create admin dashboard', status: 'review', priority: 'low' },
      { title: 'Optimize database queries', status: 'review', priority: 'medium' },
      { title: 'Add unit tests', status: 'review', priority: 'high' },
    ];

    const labels = ['Frontend', 'Backend', 'DevOps', 'Database', 'API', 'UI/UX'];
    const companies = ['Tech Company', 'Context Company', 'Startup Inc'];

    let taskCount = 0;

    for (const board of boards) {
      console.log(`\nAdding tasks to board: ${board.name}`);
      
      for (let i = 0; i < taskTemplates.length; i++) {
        const template = taskTemplates[i];
        const taskData = {
          title: template.title,
          description: `Task description for ${template.title}`,
          status: template.status,
          priority: template.priority,
          labels: labels[i % labels.length],
          company: companies[i % companies.length],
          boardId: board.id,
          position: i,
          dueDate: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)), // Staggered dates
        };

        await prisma.task.create({ data: taskData });
        taskCount++;
        console.log(`  ✓ Added: ${template.title}`);
      }
    }

    console.log(`\n✓ Successfully added ${taskCount} tasks across ${boards.length} boards`);
    
  } catch (error) {
    console.error('Error adding test tasks:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestTasks();

