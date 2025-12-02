"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "../../auth";
import bcrypt from "bcryptjs";
import { logActivity } from "./activity.actions";

export async function getAllUsers() {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        password: true,
        _count: {
          select: {
            boards: true,
            assignedTasks: true,
            comments: true,
            timeEntries: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get task counts per user in a single query using aggregation
    const userIds = users.map(u => u.id);
    const taskCounts = await prisma.task.groupBy({
      by: ['assigneeId'],
      where: {
        assigneeId: { in: userIds },
        isArchived: false,
        board: {
          isArchived: false
        }
      },
      _count: true
    });

    const taskCountMap = new Map(
      taskCounts.map(tc => [tc.assigneeId, tc._count])
    );

    return users.map(user => ({
      ...user,
      taskCount: taskCountMap.get(user.id) || 0
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

export async function getDatabaseStats() {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  try {
    const [userCount, taskCount, boardCount, commentCount] = await Promise.all([
      prisma.user.count(),
      prisma.task.count(),
      prisma.board.count(),
      prisma.comment.count(),
    ]);

    return {
      users: userCount,
      tasks: taskCount,
      boards: boardCount,
      comments: commentCount,
    };
  } catch (error) {
    console.error("Error fetching database stats:", error);
    return {
      users: 0,
      tasks: 0,
      boards: 0,
      comments: 0,
    };
  }
}

export async function getCurrentUserProfile() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error("USER_DELETED");
  }

  return user;
}

export async function updateCurrentUserProfile(data: {
  name?: string;
  email?: string;
  password?: string;
  emailVerified?: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const before = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, emailVerified: true },
  });

  const updateData: Record<string, unknown> = {};

  if (typeof data.name === "string") {
    updateData.name = data.name.trim();
  }

  if (typeof data.email === "string") {
    const email = data.email.trim().toLowerCase();
    // Ensure email is unique if it changes
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== session.user.id) {
      throw new Error("EMAIL_TAKEN");
    }
    updateData.email = email;
  }

  if (typeof data.password === "string" && data.password.trim().length > 0) {
    const hashed = await bcrypt.hash(data.password.trim(), 12);
    updateData.password = hashed;
  }

  // Only allow setting emailVerified to true, never to false
  // Once verified, it cannot be unverified
  if (typeof data.emailVerified === "boolean" && data.emailVerified === true) {
    // Only set if not already verified (prevent unnecessary updates)
    if (!before?.emailVerified) {
      updateData.emailVerified = new Date();
    }
  }
  // If emailVerified is false or not provided, don't change it

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  try {
    const changes: string[] = [];
    if (before) {
      if (typeof data.name === "string" && data.name.trim() !== (before.name || "")) changes.push("name");
      if (typeof data.email === "string" && data.email.trim().toLowerCase() !== before.email.toLowerCase()) changes.push("email");
      if (typeof data.password === "string" && data.password.trim().length > 0) changes.push("password");
      if (typeof data.emailVerified === "boolean" && (!!before.emailVerified) !== data.emailVerified) changes.push("email verification");
    }
    if (changes.length > 0) {
      await logActivity({
        type: "profile_updated",
        message: `Updated profile (${changes.join(", ")})`,
      });
    }
  } catch {}

  return updated;
}

