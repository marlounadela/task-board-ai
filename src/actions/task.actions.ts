"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { taskSchema } from "@/lib/validations";
import { auth } from "../../auth";
import { updateBoardTimestamp } from "./board.actions";
import { logActivity } from "./activity.actions";
import { realtimeBus } from "@/lib/events";
import { format } from "date-fns";
import { createNotification } from "./notification.actions";
import { getTasks, getAllTasks as getAllTasksLib } from "@/lib/tasks";

export async function createTask(boardId: string, data: unknown) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized - Please sign in");
  }

  // Verify the board exists (global workspace; no ownership enforcement)
  const board = await prisma.board.findFirst({
    where: { id: boardId }
  });

  if (!board) {
    throw new Error("Board not found");
  }

  const validated = taskSchema.parse(data);
  
  const task = await prisma.task.create({
    data: {
      ...validated,
      boardId,
      position: await getNextPosition(boardId, validated.status),
    },
    include: { 
      subtasks: true, 
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      }
    },
  });

  // Update board timestamp when task is created
  await updateBoardTimestamp(boardId);

  // Log activity
  await logActivity({
    type: "task_created",
    message: `Created task "${task.title}"`,
    taskId: task.id,
    boardId: boardId,
  });

  // If task is assigned to someone other than the creator, create notification
  if (task.assigneeId && task.assigneeId !== session.user.id) {
    try {
      const creatorName = session.user.name || session.user.email || "Someone";
      await createNotification({
        type: "task_assigned",
        message: `${creatorName} assigned you to task "${task.title}"`,
        userId: task.assigneeId,
        taskId: task.id,
        boardId: boardId,
      });
      
      // Publish realtime event so the assigned user's UI can update
      realtimeBus.publish({
        type: "notification_new",
        payload: { userId: task.assigneeId },
      });
    } catch (error) {
      console.error("Error creating task assignment notification:", error);
    }
  }

  // Publish realtime event
  realtimeBus.publish({ type: "task_created", payload: { boardId, taskId: task.id } });

  revalidatePath(`/board/${boardId}`);
  return task;
}

// Helper function to format date for display
function formatDateForDisplay(date: Date | null | undefined): string {
  if (!date) return "None";
  try {
    return format(new Date(date), "MM/dd/yyyy");
  } catch {
    return "Invalid date";
  }
}

// Helper function to strip HTML tags for comparison
function stripHtmlTags(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

// Helper function to build a short summary for notifications
function buildNotificationSummary(changeMessage: string, taskTitle: string): string {
  // Extract the changes part from messages like "Edited task "X" - changed: Y"
  // or "Edited task "X" - changed Y"
  const match = changeMessage.match(/changed(?::|)\s*(.+)/i);
  if (match && match[1]) {
    // Return just the changes part, removing the task title reference if present
    return match[1].replace(new RegExp(taskTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'it').trim();
  }
  // Fallback: remove the task title and "Edited task" prefix
  return changeMessage
    .replace(/^Edited task\s+"/, '')
    .replace(/"\s*-?\s*/, '')
    .replace(new RegExp(taskTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'it');
}

// Helper function to build comprehensive change message
async function buildChangeMessage(
  existingTask: {
    title: string;
    description: string | null;
    status: string;
    priority: string | null;
    dueDate: Date | null;
    labels: string;
    company: string | null;
    assigneeId: string | null;
  },
  updateData: Record<string, unknown>,
  updatedTask: {
    title: string;
    description: string | null;
    status: string;
    priority: string | null;
    dueDate: Date | null;
    labels: string;
    company: string | null;
    assigneeId: string | null;
    assignee?: { name: string | null; email: string } | null;
  },
  boardId: string
): Promise<string> {
  const changes: string[] = [];
  const taskTitle = updatedTask.title || existingTask.title;

  // Check title
  if ('title' in updateData && updateData.title !== existingTask.title) {
    changes.push(`title from "${existingTask.title}" to "${updateData.title as string}"`);
  }

  // Check description (strip HTML for comparison)
  if ('description' in updateData) {
    const oldDesc = stripHtmlTags(existingTask.description || "");
    const newDesc = stripHtmlTags(updatedTask.description || "");
    if (oldDesc !== newDesc) {
      if (newDesc) {
        changes.push("description");
      } else {
        changes.push("description (removed)");
      }
    }
  }

  // Check status
  if ('status' in updateData && updateData.status !== existingTask.status) {
    const oldStatusId = existingTask.status;
    const newStatusId = updateData.status as string;
    // Get column labels for both old and new status
    const oldStatusLabel = await getColumnLabel(boardId, oldStatusId);
    const newStatusLabel = await getColumnLabel(boardId, newStatusId);
    changes.push(`status from "${oldStatusLabel}" to "${newStatusLabel}"`);
  }

  // Check priority
  if ('priority' in updateData) {
    const oldPriority = existingTask.priority || "None";
    const newPriority = (updateData.priority as string) || "None";
    if (oldPriority !== newPriority) {
      changes.push(`priority from "${oldPriority}" to "${newPriority}"`);
    }
  }

  // Check due date
  if ('dueDate' in updateData) {
    const oldDate = existingTask.dueDate;
    const newDate = updatedTask.dueDate;
    // Compare dates by formatting them
    const oldDateStr = formatDateForDisplay(oldDate);
    const newDateStr = formatDateForDisplay(newDate);
    if (oldDateStr !== newDateStr) {
      changes.push(`due date from "${oldDateStr}" to "${newDateStr}"`);
    }
  }

  // Check labels
  if ('labels' in updateData && updateData.labels !== existingTask.labels) {
    const oldLabels = existingTask.labels || "None";
    const newLabels = updatedTask.labels || "None";
    changes.push(`labels from "${oldLabels}" to "${newLabels}"`);
  }

  // Check company
  if ('company' in updateData) {
    const oldCompany = existingTask.company || "None";
    const newCompany = updatedTask.company || "None";
    if (oldCompany !== newCompany) {
      changes.push(`company from "${oldCompany}" to "${newCompany}"`);
    }
  }

  // Check assignee
  if ('assigneeId' in updateData) {
    const oldAssigneeId = existingTask.assigneeId;
    const newAssigneeId = updatedTask.assigneeId;
    
    if (oldAssigneeId !== newAssigneeId) {
      // Fetch old assignee name if it exists
      let oldAssigneeName = "Unassigned";
      if (oldAssigneeId) {
        const oldAssignee = await prisma.user.findUnique({
          where: { id: oldAssigneeId },
          select: { name: true, email: true }
        });
        oldAssigneeName = oldAssignee?.name || oldAssignee?.email || "Unknown User";
      }
      
      const newAssigneeName = updatedTask.assignee?.name || updatedTask.assignee?.email || "Unassigned";
      changes.push(`assignee from "${oldAssigneeName}" to "${newAssigneeName}"`);
    }
  }

  if (changes.length === 0) {
    return `Updated task "${taskTitle}" (no changes detected)`;
  }

  // Build the message
  if (changes.length === 1) {
    return `Edited task "${taskTitle}" - changed ${changes[0]}`;
  } else {
    const changesList = changes.join(", ");
    return `Edited task "${taskTitle}" - changed: ${changesList}`;
  }
}

export async function updateTask(taskId: string, data: unknown) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized - Please sign in");
  }

  try {
    const validated = taskSchema.partial().parse(data);
    
    // Explicitly handle dueDate - if it's null, set it to null in database
    // If undefined, don't include it in the update (leave existing value)
    const updateData: Record<string, unknown> = { ...validated };
    if ('dueDate' in validated) {
      if (validated.dueDate === null || validated.dueDate === undefined) {
        // Explicitly set to null to clear the date
        updateData.dueDate = null;
      }
      // If it's a Date object, Prisma will handle it correctly
    }
    
    // Check if task exists - include assignee to get old assignee info
    const existingTask = await prisma.task.findFirst({
      where: { id: taskId },
      include: { 
        board: true,
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!existingTask) {
      return null;
    }
    
    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: { 
        subtasks: true, 
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
    });

    // Update board timestamp when task is updated
    await updateBoardTimestamp(task.boardId);

    // Check if any changes were made
    const hasChanges = Object.keys(updateData).length > 0;
    
    if (hasChanges) {
      // Build comprehensive change message
      const changeMessage = await buildChangeMessage(
        {
          title: existingTask.title,
          description: existingTask.description,
          status: existingTask.status,
          priority: existingTask.priority,
          dueDate: existingTask.dueDate,
          labels: existingTask.labels,
          company: existingTask.company,
          assigneeId: existingTask.assigneeId,
        },
        updateData,
        {
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          labels: task.labels,
          company: task.company,
          assigneeId: task.assigneeId,
          assignee: task.assignee,
        },
        task.boardId
      );

      // Check if assignee changed - do this BEFORE logging activity so we can notify even if it's the only change
      if ('assigneeId' in updateData) {
        const oldAssigneeId = existingTask.assigneeId;
        const newAssigneeId = task.assigneeId;
        
        // If assignee actually changed and new assignee is different from current user, create notification
        if (oldAssigneeId !== newAssigneeId && newAssigneeId && newAssigneeId !== session.user.id) {
          try {
            const assignerName = session.user.name || session.user.email || "Someone";
            await createNotification({
              type: "task_assigned",
              message: `${assignerName} assigned you to task "${task.title}"`,
              userId: newAssigneeId,
              taskId: task.id,
              boardId: task.boardId,
            });
            
            // Publish realtime event so the assigned user's UI can update
            realtimeBus.publish({
              type: "notification_new",
              payload: { userId: newAssigneeId },
            });
          } catch (error) {
            console.error("Error creating task assignment notification:", error);
          }
        }
      }

      // Notify assignee when someone else edits their assigned task
      // Only notify if there are actual changes and the assignee is different from the editor
      if (!changeMessage.includes("no changes detected")) {
        const currentAssigneeId = task.assigneeId;
        const assigneeChanged = 'assigneeId' in updateData && 
          existingTask.assigneeId !== task.assigneeId;
        
        // Check if there are changes other than just the assignee
        const hasOtherChanges = assigneeChanged 
          ? Object.keys(updateData).length > 1 
          : true;
        
        // Notify current assignee if they exist, are different from editor, and there were other changes
        if (hasOtherChanges && currentAssigneeId && currentAssigneeId !== session.user.id) {
          try {
            const editorName = session.user.name || session.user.email || "Someone";
            const summaryMessage = buildNotificationSummary(changeMessage, task.title);
            
            await createNotification({
              type: "task_updated",
              message: `${editorName} updated task "${task.title}": ${summaryMessage}`,
              userId: currentAssigneeId,
              taskId: task.id,
              boardId: task.boardId,
            });
            
            // Publish realtime event so the assigned user's UI can update
            realtimeBus.publish({
              type: "notification_new",
              payload: { userId: currentAssigneeId },
            });
          } catch (error) {
            console.error("Error creating task update notification:", error);
          }
        }
        
        // Also notify old assignee if they were unassigned (removed) and different from editor
        if (assigneeChanged && existingTask.assigneeId && 
            !currentAssigneeId && 
            existingTask.assigneeId !== session.user.id) {
          try {
            const editorName = session.user.name || session.user.email || "Someone";
            
            await createNotification({
              type: "task_updated",
              message: `${editorName} removed your assignment from task "${task.title}"`,
              userId: existingTask.assigneeId,
              taskId: task.id,
              boardId: task.boardId,
            });
            
            realtimeBus.publish({
              type: "notification_new",
              payload: { userId: existingTask.assigneeId },
            });
          } catch (error) {
            console.error("Error creating task unassignment notification:", error);
          }
        }
      }

      // Only log if there are actual changes (not just "no changes detected")
      if (!changeMessage.includes("no changes detected")) {
        // Determine activity type based on changes
        // If only status changed, use status_changed type for consistency
        const onlyStatusChanged = 
          Object.keys(updateData).length === 1 && 
          'status' in updateData && 
          updateData.status !== existingTask.status;

        await logActivity({
          type: onlyStatusChanged ? "status_changed" : "task_updated",
          message: changeMessage,
          taskId: task.id,
          boardId: task.boardId,
        });
      }
    }

    // Publish realtime event
    realtimeBus.publish({ type: "task_updated", payload: { boardId: task.boardId, taskId: task.id } });

    revalidatePath(`/board/${task.boardId}`);
    return task;
  } catch (error) {
    console.error("Error updating task:", error);
    return null;
  }
}

export async function deleteTask(taskId: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized - Please sign in");
  }

  try {
    // Check if task exists
    const existingTask = await prisma.task.findFirst({
      where: { id: taskId },
      include: { board: true }
    });

    if (!existingTask) {
      return;
    }

    const task = await prisma.task.delete({ where: { id: taskId } });
    
    // Update board timestamp when task is deleted
    await updateBoardTimestamp(task.boardId);
    await logActivity({
      type: "task_deleted",
      message: `Deleted task "${task.title}"`,
      taskId: task.id,
      boardId: task.boardId,
    });
    // Publish realtime event
    realtimeBus.publish({ type: "task_deleted", payload: { boardId: task.boardId, taskId: task.id } });
    
    revalidatePath(`/board/${task.boardId}`);
  } catch {
    // Error deleting task
  }
}

export async function reorderTasks(
  boardId: string,
  taskId: string,
  newStatus: string,
  newPosition: number
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized - Please sign in");
  }

  try {
    // Check if task exists
    const existingTask = await prisma.task.findFirst({
      where: { id: taskId },
      include: { board: true }
    });

    if (!existingTask) {
      return;
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { status: newStatus, position: newPosition },
    });

    // Update board timestamp when task is reordered
    await updateBoardTimestamp(boardId);

    // Get the column label for the status
    const statusLabel = await getColumnLabel(boardId, newStatus);

    // Log status change
    await logActivity({
      type: "status_changed",
      message: `Moved task to ${statusLabel}`,
      taskId,
      boardId,
    });

  // Publish realtime reorder event
  realtimeBus.publish({ type: "status_changed", payload: { boardId, taskId, status: newStatus } });

    revalidatePath(`/board/${boardId}`);
  } catch {
    // Error reordering tasks
  }
}

// Helper function to get column label from status ID
async function getColumnLabel(boardId: string, statusId: string): Promise<string> {
  const defaultLabels: Record<string, string> = {
    "todo": "To Do",
    "in-progress": "In Progress",
    "review": "Review",
    "done": "Done"
  };

  try {
    const board = await prisma.board.findFirst({
      where: { id: boardId },
      select: { columnLabels: true }
    });

    if (board?.columnLabels) {
      const columnLabels = JSON.parse(board.columnLabels) as Record<string, string>;
      return columnLabels[statusId] || defaultLabels[statusId] || statusId;
    }
    
    return defaultLabels[statusId] || statusId;
  } catch {
    return defaultLabels[statusId] || statusId;
  }
}

async function getNextPosition(boardId: string, status: string): Promise<number> {
  // For LIFO (Last-In, First-Out), new tasks should be added at position 0
  // and existing tasks should be shifted down
  // Use a single query to increment all positions instead of individual updates
  await prisma.task.updateMany({
    where: { boardId, status },
    data: {
      position: {
        increment: 1
      }
    }
  });
  
  // New task gets position 0 (top of the list)
  return 0;
}

export async function archiveTask(taskId: string) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error("Unauthorized - Please sign in");
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { 
      isArchived: true,
      updatedAt: new Date()
    }
  });

  // Update board timestamp and log activity
  await updateBoardTimestamp(task.boardId);
  await logActivity({
    type: "task_archived",
    message: `Archived task "${task.title}"`,
    taskId: task.id,
    boardId: task.boardId,
  });
}

export async function unarchiveTask(taskId: string) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error("Unauthorized - Please sign in");
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { 
      isArchived: false,
      updatedAt: new Date()
    }
  });

  // Update board timestamp and log activity
  await updateBoardTimestamp(task.boardId);
  await logActivity({
    type: "task_unarchived",
    message: `Restored task "${task.title}"`,
    taskId: task.id,
    boardId: task.boardId,
  });
}

export async function getArchivedTasks(): Promise<Array<{
  id: string;
  title: string;
  status: string;
  board: {
    id: string;
    name: string;
    columnLabels: string | null;
  };
  updatedAt: Date;
}>> {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error("Unauthorized - Please sign in");
  }

  const userId = session.user.id;

  const tasks = await prisma.task.findMany({
    where: {
      board: {
        userId
      },
      isArchived: true
    },
    include: {
      board: {
        select: {
          id: true,
          name: true,
          columnLabels: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return tasks.map(t => ({
    id: t.id,
    title: t.title,
    status: t.status,
    board: t.board,
    updatedAt: t.updatedAt
  }));
}

// Fetch tasks for a specific board
export async function fetchTasksAction(boardId: string) {
  return await getTasks(boardId);
}

// Fetch all tasks across all boards (global visibility)
export async function fetchAllTasksAction() {
  const session = await auth();
  
  if (!session?.user && process.env.NODE_ENV === "production") {
    throw new Error("Unauthorized - Please sign in");
  }

  if (!session?.user?.id) {
    return [];
  }

  return await getAllTasksLib();
}

// Search tasks with indexing support
export async function searchTasks(query: string, limit: number = 10) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return [];
  }

  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    // SQLite doesn't support case-insensitive mode, so we use contains which works with SQLite
    // The indexes on title, description, labels, and company will help with performance
    const tasks = await prisma.task.findMany({
      where: {
        isArchived: false,
        board: {
          isArchived: false
        },
        OR: [
          { title: { contains: query.trim() } },
          { description: { contains: query.trim() } },
          { labels: { contains: query.trim() } },
          { company: { contains: query.trim() } }
        ]
      },
      include: {
        board: {
          select: {
            id: true,
            name: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        subtasks: true,
        comments: true
      },
      orderBy: [
        { updatedAt: 'desc' }
      ],
      take: limit
    });

    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority || "medium",
      labels: task.labels || "",
      company: task.company || undefined,
      boardId: task.boardId,
      boardName: task.board.name,
      assignee: task.assignee ? {
        name: task.assignee.name || "Unknown",
        image: task.assignee.image || "/avatar-default.svg"
      } : undefined,
      assigneeId: task.assigneeId || undefined,
      createdAt: task.createdAt.toISOString()
    }));
  } catch (error) {
    console.error("Error searching tasks:", error);
    return [];
  }
}