"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "../../auth";
import { realtimeBus } from "@/lib/events";

type ActivityType =
  | "task_created"
  | "task_updated"
  | "status_changed"
  | "task_deleted"
  | "task_archived"
  | "task_unarchived"
  | "comment_added"
  | "board_created"
  | "board_archived"
  | "board_unarchived"
  | "board_deleted"
  | "column_created"
  | "column_deleted"
  | "profile_updated";

export type RecentActivity = {
  id: string;
  type: ActivityType | string;
  message: string;
  createdAt: Date;
  user: { id: string; name: string | null; image: string | null; email: string };
  task?: { id: string; title: string } | null;
  board?: { id: string; name: string } | null;
};

export async function logActivity(params: {
  type: ActivityType;
  message: string;
  taskId?: string;
  boardId?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return; // ignore when unauthenticated

  try {
    await prisma.activity.create({
      data: {
        type: params.type,
        message: params.message,
        userId: session.user.id,
        taskId: params.taskId,
        boardId: params.boardId,
      },
    });
    // Publish realtime activity event
    realtimeBus.publish({ type: "activity_new", payload: { type: params.type } });
  } catch {
    // do not throw from logging
  }
}

export async function getRecentActivities(limit = 10): Promise<RecentActivity[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return []; // Return empty array instead of throwing when unauthenticated
  }

  // Ensure the user backing the current session still exists
  const existingUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!existingUser) {
    return []; // Return empty array if user was deleted
  }

  // Show activities across all boards (global workspace)
  const activities = await prisma.activity.findMany({
    include: {
      user: { select: { id: true, name: true, image: true, email: true } },
      task: { select: { id: true, title: true } },
      board: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return activities as unknown as RecentActivity[];
}


