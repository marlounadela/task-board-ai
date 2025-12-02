"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "../../auth";

export type NotificationType = "mention" | "task_assigned" | "task_updated" | "board_edited" | "email_verification";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  userId: string;
  isRead: boolean;
  taskId?: string | null;
  boardId?: string | null;
  commentId?: string | null;
  createdAt: Date;
}

export async function createNotification(data: {
  type: NotificationType;
  message: string;
  userId: string;
  taskId?: string;
  boardId?: string;
  commentId?: string;
}) {
  try {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true },
    });
    
    if (!user) {
      throw new Error(`User not found: ${data.userId}`);
    }
    
    const notification = await prisma.notification.create({
      data,
    });
    
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

export async function getNotifications(limit = 50): Promise<Notification[]> {
  const session = await auth();
  
  if (!session?.user?.id) {
    return [];
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return notifications as Notification[];
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

export async function getUnreadNotificationCount() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return 0;
  }

  try {
    const count = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    });

    return count;
  } catch (error) {
    console.error("Error fetching unread notification count:", error);
    return 0;
  }
}

export async function markNotificationAsRead(notificationId: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // Verify the notification belongs to the current user
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: session.user.id,
      },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

export async function markAllNotificationsAsRead() {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    return { success: true };
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
}

/**
 * Checks if user's email is verified and ensures a notification exists if not verified.
 * This notification will persist until the email is verified.
 */
export async function ensureEmailVerificationNotification() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return;
  }

  try {
    // Get user's email verification status
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true },
    });

    if (!user) {
      return;
    }

    // If email is verified, remove any existing email verification notifications
    if (user.emailVerified) {
      await prisma.notification.deleteMany({
        where: {
          userId: session.user.id,
          type: "email_verification",
        },
      });
      return;
    }

    // If email is not verified, check if notification already exists
    const existingNotification = await prisma.notification.findFirst({
      where: {
        userId: session.user.id,
        type: "email_verification",
      },
    });

    // Create notification if it doesn't exist
    if (!existingNotification) {
      await prisma.notification.create({
        data: {
          type: "email_verification",
          message: "Please verify your email address to access all features",
          userId: session.user.id,
          isRead: false,
        },
      });
    }
  } catch (error) {
    console.error("Error ensuring email verification notification:", error);
  }
}

