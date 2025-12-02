const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupBoards() {
  try {
    console.log('🔧 Setting up boards...');
    
    // Get or create default user
    const defaultUser = await prisma.user.upsert({
      where: { email: "dev@example.com" },
      update: {},
      create: {
        email: "dev@example.com",
        name: "Development User"
      }
    });
    
    console.log('✅ User ready:', defaultUser.email);
    
    // Check if Main Board exists
    let mainBoard = await prisma.board.findFirst({
      where: { name: "Main Board" }
    });
    
    if (!mainBoard) {
      mainBoard = await prisma.board.create({
        data: {
          name: "Main Board",
          userId: defaultUser.id
        }
      });
      console.log('✅ Created Main Board:', mainBoard.id);
    } else {
      console.log('✅ Main Board already exists:', mainBoard.id);
    }
    
    // Check if Review Board exists
    let reviewBoard = await prisma.board.findFirst({
      where: { name: "Review Board" }
    });
    
    if (!reviewBoard) {
      reviewBoard = await prisma.board.create({
        data: {
          name: "Review Board",
          userId: defaultUser.id
        }
      });
      console.log('✅ Created Review Board:', reviewBoard.id);
    } else {
      console.log('✅ Review Board already exists:', reviewBoard.id);
    }
    
    // List all boards
    const allBoards = await prisma.board.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`\n📊 Total boards: ${allBoards.length}`);
    allBoards.forEach((board, index) => {
      console.log(`${index + 1}. ${board.name} (${board.id})`);
    });
    
  } catch (error) {
    console.error('❌ Error setting up boards:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupBoards();
