const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBoards() {
  try {
    console.log('🔍 Checking boards in database...');
    
    const boards = await prisma.board.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      }
    });

    console.log(`📊 Found ${boards.length} boards:`);
    
    if (boards.length === 0) {
      console.log('❌ No boards found in database');
    } else {
      boards.forEach((board, index) => {
        console.log(`${index + 1}. Board: ${board.name}`);
        console.log(`   ID: ${board.id}`);
        console.log(`   Owner: ${board.user.name} (${board.user.email})`);
        console.log(`   Tasks: ${board._count.tasks}`);
        console.log(`   Created: ${board.createdAt}`);
        console.log('─────────────────────────────────────────────────');
      });
    }

  } catch (error) {
    console.error('❌ Error checking boards:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBoards();
