"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "../../auth";
import { logActivity } from "./activity.actions";
import { realtimeBus } from "@/lib/events";
import { createNotification } from "./notification.actions";

export async function getOrCreateMainBoard() {
  const session = await auth();
  
  // Require authentication
  if (!session?.user?.id) {
    throw new Error("Unauthorized - Please sign in");
  }

  const userId = session.user.id;

  // Try to find existing main board for this user
  let board = await prisma.board.findFirst({
    where: { 
      name: "Main Board",
      userId
    }
  });

  // If no board exists, create one
  if (!board) {
    board = await prisma.board.create({
      data: {
        name: "Main Board",
        userId
      }
    });
  }

  return board;
}

export async function getOrCreateReviewBoard() {
  const session = await auth();
  
  // Require authentication
  if (!session?.user?.id) {
    throw new Error("Unauthorized - Please sign in");
  }

  const userId = session.user.id;

  // Try to find existing review board for this user
  let board = await prisma.board.findFirst({
    where: { 
      name: "Review Board",
      userId
    }
  });

  // If no board exists, create one
  if (!board) {
    board = await prisma.board.create({
      data: {
        name: "Review Board",
        userId
      }
    });
  }

  return board;
}

export async function getAllBoards() {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized - Please sign in");
  }

  // Get all non-archived boards globally, sorted by most recently updated
  const boards = await prisma.board.findMany({
    where: { 
      isArchived: false
    },
    orderBy: { updatedAt: 'desc' }
  });

  // Keep creation path as-is: if absolutely no boards in the system, seed Main/Review for this user
  if (boards.length === 0) {
    const userId: string = session.user.id;
    const [mainBoard, reviewBoard] = await Promise.all([
      prisma.board.create({
        data: {
          name: "Main Board",
          userId: userId
        }
      }),
      prisma.board.create({
        data: {
          name: "Review Board",
          userId: userId
        }
      })
    ]);
    return [mainBoard, reviewBoard];
  }

  return boards;
}

export async function createBoard(name: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized - Please sign in");
  }

  const userId = session.user.id;

  const board = await prisma.board.create({
    data: {
      name: name.trim() || `Board ${Date.now()}`,
      userId
    }
  });

  await logActivity({
    type: "board_created",
    message: `Created board "${board.name}"`,
    boardId: board.id,
  });

  realtimeBus.publish({ type: "board_updated", payload: { boardId: board.id } });

  return board;
}

export async function getBoardById(boardId: string) {
  const session = await auth();
  
  // Require authentication
  if (!session?.user?.id) {
    throw new Error("Unauthorized - Please sign in");
  }

  const userId = session.user.id;

  const board = await prisma.board.findFirst({
    where: { 
      id: boardId,
      userId  // Ensure user owns the board
    }
  });

  return board;
}

export async function updateBoardTimestamp(boardId: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return; // Silently fail if not authenticated
  }

  try {
    // Update board timestamp (global workspace; no ownership enforcement)
    await prisma.board.updateMany({
      where: { 
        id: boardId
      },
      data: { updatedAt: new Date() }
    });
    realtimeBus.publish({ type: "board_updated", payload: { boardId } });
  } catch {
    // Error updating board timestamp
  }
}

export async function archiveBoard(boardId: string) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error("Unauthorized - Please sign in");
  }

  // Get board info before archiving to include name in activity
  const board = await prisma.board.findFirst({
    where: { id: boardId }
  });

  if (!board) {
    throw new Error("Board not found");
  }

  await prisma.board.update({
    where: { id: boardId },
    data: { 
      isArchived: true,
      updatedAt: new Date()
    }
  });
  await logActivity({
    type: "board_archived",
    message: `Archived board "${board.name}"`,
    boardId,
  });
  realtimeBus.publish({ type: "board_updated", payload: { boardId } });
}

export async function unarchiveBoard(boardId: string) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error("Unauthorized - Please sign in");
  }

  // Get board info before unarchiving to include name in activity
  const board = await prisma.board.findFirst({
    where: { id: boardId }
  });

  if (!board) {
    throw new Error("Board not found");
  }

  await prisma.board.update({
    where: { id: boardId },
    data: { 
      isArchived: false,
      updatedAt: new Date()
    }
  });
  await logActivity({
    type: "board_unarchived",
    message: `Unarchived board "${board.name}"`,
    boardId,
  });
  realtimeBus.publish({ type: "board_updated", payload: { boardId } });
}

export async function deleteBoard(boardId: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized - Please sign in");
  }

  const userId = session.user.id;

  // Get board info before deleting to include name in activity log
  const board = await prisma.board.findFirst({
    where: { 
      id: boardId,
      userId  // Ensure user owns the board
    }
  });

  if (!board) {
    throw new Error("Board not found");
  }

  const boardName = board.name;

  // Log the deletion activity BEFORE deleting the board
  // The activity will persist after board deletion (boardId will be set to null
  // due to onDelete: SetNull in the schema)
  await logActivity({
    type: "board_deleted",
    message: `Deleted board "${boardName}"`,
    boardId: boardId,
  });

  // Delete the board (cascade will handle related tasks, etc.)
  // The activity log will be preserved with boardId set to null
  await prisma.board.delete({
    where: { id: boardId }
  });

  // Publish realtime event
  realtimeBus.publish({ type: "board_deleted", payload: { boardId } });
}

export async function getArchivedBoards() {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error("Unauthorized - Please sign in");
  }

  const userId = session.user.id;

  const boards = await prisma.board.findMany({
    where: { 
      userId,
      isArchived: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  return boards;
}

export async function updateColumnLabels(boardId: string, columnId: string, label: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized - Please sign in");
  }

  const userId = session.user.id;

  // Get the current board
  const board = await prisma.board.findFirst({
    where: { 
      id: boardId,
      userId
    }
  });

  if (!board) {
    throw new Error("Board not found");
  }

  // Parse existing column labels or use defaults
  const defaultLabels = {
    "todo": "To Do",
    "in-progress": "In Progress",
    "review": "Review",
    "done": "Done"
  };

  let columnLabels: Record<string, string>;
  try {
    columnLabels = board.columnLabels ? JSON.parse(board.columnLabels) : defaultLabels;
  } catch {
    columnLabels = defaultLabels;
  }

  // Update the specific column label
  columnLabels[columnId] = label;

  // Save back to database
  await prisma.board.update({
    where: { id: boardId },
    data: {
      columnLabels: JSON.stringify(columnLabels),
      updatedAt: new Date()
    }
  });

  // Notify board owner if someone else edited their board
  if (board.userId !== userId) {
    try {
      const editorName = session.user.name || session.user.email || "Someone";
      await createNotification({
        type: "board_edited",
        message: `${editorName} edited column labels on your board "${board.name}"`,
        userId: board.userId,
        boardId: boardId,
      });
    } catch (error) {
      console.error("Error creating board edit notification:", error);
    }
  }

  return columnLabels;
}

export async function deleteCustomColumn(boardId: string, columnId: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized - Please sign in");
  }

  const userId = session.user.id;

  // Prevent deletion of default columns
  const defaultColumns = ["todo", "in-progress", "review", "done"];
  if (defaultColumns.includes(columnId)) {
    throw new Error("Cannot delete default columns");
  }

  // Ensure board exists and is owned by the user
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      userId
    }
  });

  if (!board) {
    throw new Error("Board not found");
  }

  // Load existing labels or defaults
  const defaultLabels = {
    "todo": "To Do",
    "in-progress": "In Progress",
    "review": "Review",
    "done": "Done"
  } as Record<string, string>;

  let columnLabels: Record<string, string>;
  try {
    columnLabels = board.columnLabels ? JSON.parse(board.columnLabels) : defaultLabels;
  } catch {
    columnLabels = defaultLabels;
  }

  // Check if column exists (for custom columns)
  if (!columnLabels[columnId] && !columnId.startsWith('custom')) {
    throw new Error("Column not found");
  }

  // Move all tasks from this column to "todo"
  const tasksInColumn = await prisma.task.findMany({
    where: {
      boardId,
      status: columnId,
      isArchived: false
    }
  });

  if (tasksInColumn.length > 0) {
    // Get the maximum position in "todo" column
    const todoTasks = await prisma.task.findMany({
      where: {
        boardId,
        status: "todo",
        isArchived: false
      },
      orderBy: { position: "desc" },
      take: 1
    });

    const maxPosition = todoTasks.length > 0 ? todoTasks[0].position : -1;

    // Move all tasks to "todo" column using a transaction for efficiency
    await prisma.$transaction(
      tasksInColumn.map((task, i) =>
        prisma.task.update({
          where: { id: task.id },
          data: {
            status: "todo",
            position: maxPosition + 1 + i
          }
        })
      )
    );
  }

  // Remove the column from labels
  delete columnLabels[columnId];

  // Save updated labels
  await prisma.board.update({
    where: { id: boardId },
    data: {
      columnLabels: JSON.stringify(columnLabels),
      updatedAt: new Date()
    }
  });

  // Log activity for column deletion
  try {
    await logActivity({
      type: "column_deleted",
      message: `Deleted column "${columnId}"`,
      boardId: boardId,
    });
  } catch {
    // ignore logging failures
  }

  // Notify board owner if someone else edited their board
  if (board.userId !== userId) {
    try {
      const editorName = session.user.name || session.user.email || "Someone";
      await createNotification({
        type: "board_edited",
        message: `${editorName} deleted a column on your board "${board.name}"`,
        userId: board.userId,
        boardId: boardId,
      });
    } catch (error) {
      console.error("Error creating board edit notification:", error);
    }
  }

  // Update board timestamp
  await updateBoardTimestamp(boardId);

  return { columnLabels, movedTasksCount: tasksInColumn.length };
}

export async function createNextCustomColumn(boardId: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized - Please sign in");
  }

  const userId = session.user.id;

  // Verify the board exists (global workspace; no ownership enforcement for creating columns)
  const board = await prisma.board.findFirst({
    where: {
      id: boardId
    }
  });

  if (!board) {
    throw new Error("Board not found");
  }

  // Load existing labels or defaults
  const defaultLabels = {
    "todo": "To Do",
    "in-progress": "In Progress",
    "review": "Review",
    "done": "Done"
  } as Record<string, string>;

  let columnLabels: Record<string, string>;
  try {
    columnLabels = board.columnLabels ? JSON.parse(board.columnLabels) : defaultLabels;
  } catch {
    columnLabels = defaultLabels;
  }

  // Determine next custom id: custom, custom-2, custom-3, ...
  const existingCustomKeys = Object.keys(columnLabels).filter(k => /^custom(?:-\d+)?$/.test(k));
  let nextId = "custom";
  if (existingCustomKeys.length > 0) {
    // Extract numbers, default 1 for plain 'custom'
    const maxNum = existingCustomKeys.reduce((max, key) => {
      const m = key.match(/^custom(?:-(\d+))?$/);
      const n = m && m[1] ? parseInt(m[1], 10) : 1;
      return Math.max(max, n);
    }, 1);
    const nextNum = maxNum + 1;
    nextId = nextNum === 2 ? "custom-2" : `custom-${nextNum}`;
  }

  // Compute label: "Custom" for first, then "Custom N"
  let nextLabel = "Custom";
  if (nextId !== "custom") {
    const numMatch = nextId.match(/(\d+)$/);
    const num = numMatch ? parseInt(numMatch[1], 10) : 2;
    nextLabel = `Custom ${num}`;
  }

  columnLabels[nextId] = nextLabel;

  await prisma.board.update({
    where: { id: boardId },
    data: {
      columnLabels: JSON.stringify(columnLabels),
      updatedAt: new Date()
    }
  });

  // Log activity for column creation
  try {
    await logActivity({
      type: "column_created",
      message: `Added column "${nextLabel}"`,
      boardId: boardId,
    });
  } catch {
    // ignore logging failures
  }

  // Notify board owner if someone else edited their board
  if (board.userId !== userId) {
    try {
      const editorName = session.user.name || session.user.email || "Someone";
      await createNotification({
        type: "board_edited",
        message: `${editorName} added a new column to your board "${board.name}"`,
        userId: board.userId,
        boardId: boardId,
      });
    } catch (error) {
      console.error("Error creating board edit notification:", error);
    }
  }

  return { statusId: nextId, label: nextLabel, columnLabels };
}