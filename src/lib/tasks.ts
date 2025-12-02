import { prisma } from "@/lib/prisma";

// Utility function to format date to YYYY-MM-DD using UTC date components to avoid timezone shifts
function formatDateForInput(date: Date | null | undefined): string | undefined {
  if (!date) return undefined;
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Utility to map task to standardized format
function mapTaskToFormat(task: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  dueDate: Date | null;
  labels: string;
  company: string | null;
  position: number;
  comments: Array<unknown>;
  assigneeId: string | null;
  boardId: string;
  createdAt: Date;
  assignee: { name: string | null; email: string; image: string | null } | null;
}) {
  return {
    id: task.id,
    title: task.title,
    description: task.description || "",
    status: task.status,
    priority: task.priority || "medium",
    dueDate: formatDateForInput(task.dueDate),
    labels: task.labels || "",
    company: task.company || undefined,
    position: task.position,
    commentsCount: task.comments.length,
    assigneeId: task.assigneeId || undefined,
    boardId: task.boardId,
    createdAt: task.createdAt.toISOString(),
    assignee: task.assignee ? {
      name: task.assignee.name || "Unknown",
      image: task.assignee.image || "/avatar-default.svg"
    } : undefined
  };
}

export async function getTasks(boardId: string) {
  try {
    const tasks = await prisma.task.findMany({
      where: { 
        boardId,
        isArchived: false
      },
      include: {
        assignee: true,
        subtasks: true,
        comments: true,
      },
      orderBy: [
        { status: 'asc' },
        { position: 'asc' }
      ]
    });

    return tasks.map(mapTaskToFormat);
  } catch {
    return [];
  }
}

export async function getAllTasks() {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        board: {
          isArchived: false
        },
        isArchived: false
      },
      include: {
        board: true,
        assignee: true,
        subtasks: true,
        comments: true,
      },
      orderBy: [
        { status: 'asc' },
        { position: 'asc' }
      ]
    });

    return tasks.map(mapTaskToFormat);
  } catch (error) {
    console.error("getAllTasks error:", error);
    return [];
  }
}

