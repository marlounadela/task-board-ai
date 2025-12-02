"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { commentSchema } from "@/lib/validations";
import { auth } from "../../auth";
import { updateBoardTimestamp } from "./board.actions";
import { logActivity } from "./activity.actions";
import { createNotification } from "./notification.actions";
import { realtimeBus } from "@/lib/events";

export async function createComment(data: unknown) {
  const session = await auth();
  // For development, allow without authentication
  if (!session?.user && process.env.NODE_ENV === "production") {
    throw new Error("Unauthorized");
  }

  const validated = commentSchema.parse(data);
  
  const comment = await prisma.comment.create({
    data: {
      ...validated,
      userId: session?.user?.id || "default-user", // Fallback for development
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      task: {
        select: {
          boardId: true,
          title: true,
        },
      },
    },
  });

  // Update board timestamp when comment is created
  await updateBoardTimestamp(comment.task.boardId).catch(() => {});

  // Log activity
  await logActivity({
    type: "comment_added",
    message: `Commented on "${comment.task?.title ?? comment.taskId}"`,
    taskId: comment.taskId,
    boardId: comment.task.boardId,
  }).catch(() => {});

  // Detect @mentions in the comment and create notifications
  // This MUST run independently of other operations but we await it to ensure completion
  await (async () => {
    try {
      // Match @ followed by text (name or email) until space, comma, or end of string
      const mentionRegex = /@([^\s,@]+)/g;
      const mentions: string[] = [];
      let match;
      
      // Reset regex lastIndex to ensure we start from the beginning
      mentionRegex.lastIndex = 0;
      while ((match = mentionRegex.exec(comment.content)) !== null) {
        const mentionedText = match[1].trim();
        if (mentionedText) {
          mentions.push(mentionedText);
        }
      }

      if (mentions.length > 0) {
        // Find users by name or email
        const allUsers = await prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
          },
        });

        const commenterName = comment.user.name || comment.user.email || "Someone";
        const notifiedUserIds = new Set<string>(); // Prevent duplicate notifications
        
        for (const mention of mentions) {
          const mentionLower = mention.toLowerCase().trim();
          
          // Try to match by exact name, name contains, or email
          // Normalize both mention and user data for better matching (handle spaces, underscores, etc.)
          const normalizeForMatching = (text: string) => {
            return text.toLowerCase().replace(/[\s_\-]/g, ''); // Remove spaces, underscores, hyphens
          };
          
          const mentionedUser = allUsers.find(
            (user) => {
              if (notifiedUserIds.has(user.id) || user.id === comment.user.id) {
                return false;
              }
              
              const userName = (user.name || "").trim().toLowerCase();
              const userEmail = user.email.trim().toLowerCase();
              const normalizedMention = normalizeForMatching(mention);
              const normalizedUserName = normalizeForMatching(userName);
              const normalizedEmail = normalizeForMatching(userEmail);
              
              // 1. First try exact match (case-insensitive) for name
              if (userName && userName === mentionLower) {
                return true;
              }
              
              // 2. Try exact match for normalized name (handles spaces, underscores, hyphens)
              if (userName && normalizedMention === normalizedUserName) {
                return true;
              }
              
              // 3. Try partial match on normalized name
              if (userName && (normalizedUserName.includes(normalizedMention) || 
                  normalizedMention.includes(normalizedUserName))) {
                return true;
              }
              
              // 4. Exact match for email
              if (userEmail === mentionLower) {
                return true;
              }
              
              // 5. Exact match for email username part (before @)
              const emailUsername = userEmail.split('@')[0];
              if (emailUsername === mentionLower) {
                return true;
              }
              
              // 6. Match normalized email username part (before @)
              const normalizedEmailUsername = normalizeForMatching(emailUsername);
              if (normalizedMention === normalizedEmailUsername || 
                  normalizedEmailUsername.includes(normalizedMention) || 
                  normalizedMention.includes(normalizedEmailUsername)) {
                return true;
              }
              
              // 7. Contains match for email
              if (userEmail.includes(mentionLower) || mentionLower.includes(userEmail)) {
                return true;
              }
              
              // 8. Match full normalized email
              if (normalizedMention === normalizedEmail || 
                  normalizedEmail.includes(normalizedMention) || 
                  normalizedMention.includes(normalizedEmail)) {
                return true;
              }
              
              return false;
            }
          );

          if (mentionedUser) {
            notifiedUserIds.add(mentionedUser.id);
            try {
              await createNotification({
                type: "mention",
                message: `${commenterName} mentioned you in a comment on "${comment.task?.title ?? "a task"}"`,
                userId: mentionedUser.id,
                taskId: comment.taskId,
                boardId: comment.task.boardId,
                commentId: comment.id,
              });
              
              // Publish realtime event so the mentioned user's UI can update
              realtimeBus.publish({
                type: "notification_new",
                payload: { userId: mentionedUser.id },
              });
            } catch (error) {
              console.error("Error creating mention notification:", error);
              // Don't throw - we don't want notification errors to prevent comment creation
            }
          }
        }
      }
    } catch (mentionError) {
      // Critical: Log but don't fail comment creation if mention processing fails
      console.error("Error processing mentions:", mentionError);
      // Don't throw - we don't want mention errors to prevent comment creation
    }
  })();

  revalidatePath("/");
  return comment;
}

export async function getComments(taskId: string) {
  const session = await auth();
  // For development, allow without authentication
  if (!session?.user && process.env.NODE_ENV === "production") {
    throw new Error("Unauthorized");
  }

  try {
    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return comments;
  } catch (error) {
    console.error("Error fetching comments:", error);
    return [];
  }
}

export async function deleteComment(commentId: string) {
  const session = await auth();
  // For development, allow without authentication
  if (!session?.user && process.env.NODE_ENV === "production") {
    throw new Error("Unauthorized");
  }

  try {
    // First get the comment to find the task's boardId
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          select: {
            boardId: true,
          },
        },
      },
    });

    if (comment) {
      await prisma.comment.delete({
        where: { id: commentId },
      });

      // Update board timestamp when comment is deleted
      await updateBoardTimestamp(comment.task.boardId);
    }

    revalidatePath("/");
  } catch (error) {
    console.error("Error deleting comment:", error);
  }
}
