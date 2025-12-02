import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Reset token is required" },
        { status: 400 }
      );
    }

    // Find reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    // Check if token exists and is valid
    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (resetToken.expires < new Date()) {
      // Delete expired token
      await prisma.passwordResetToken.delete({
        where: { token },
      });
      return NextResponse.json(
        { error: "Reset token has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Generate a temporary password for one-time login
    const tempPassword = randomBytes(16).toString("hex");
    const hashedTempPassword = await bcrypt.hash(tempPassword, 12);

    // Temporarily update user's password to allow login
    // We'll store the original password hash (if exists) to restore later
    const originalPassword = resetToken.user.password;
    
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedTempPassword },
    });

    // Return the temporary password and user email for client-side login
    return NextResponse.json({
      success: true,
      email: resetToken.user.email,
      tempPassword,
      originalPassword: originalPassword || null, // Store original to restore if needed
    });
  } catch (error) {
    console.error("Login with reset token error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

