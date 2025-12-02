import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Verification code is required" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Look up the code for this user
    const record = await prisma.emailVerificationToken.findFirst({
      where: {
        userId,
        code,
      },
      include: { user: true },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    if (record.expires < new Date()) {
      // Delete expired code
      await prisma.emailVerificationToken.delete({
        where: { id: record.id },
      });

      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // If user is already verified, just clean up
    if (record.user.emailVerified) {
      await prisma.emailVerificationToken.deleteMany({
        where: { userId },
      });

      return NextResponse.json(
        { message: "Email is already verified" },
        { status: 200 }
      );
    }

    // Mark the user as verified
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });

    // Remove all verification tokens/codes for this user
    await prisma.emailVerificationToken.deleteMany({
      where: { userId },
    });

    // Also clear any email verification notifications
    await prisma.notification.deleteMany({
      where: {
        userId,
        type: "email_verification",
      },
    });

    return NextResponse.json(
      { message: "Email verified successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Verify code error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development"
            ? (error as { message?: string }).message
            : undefined,
      },
      { status: 500 }
    );
  }
}


