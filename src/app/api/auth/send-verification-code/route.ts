import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sendVerificationCodeEmail } from "@/lib/email";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user || !user.email) {
      return NextResponse.json(
        { error: "User not found or email missing" },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: "Email is already verified" },
        { status: 200 }
      );
    }

    // Ensure email configuration exists before generating code
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        {
          error:
            "Email service is not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.",
        },
        { status: 500 }
      );
    }

    // Generate a 6-digit numeric code
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10); // 10 minutes expiry

    try {
      // Clear any previous verification codes/tokens for this user
      await prisma.emailVerificationToken.deleteMany({
        where: { userId: user.id },
      });

      // Store the new code
      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          code,
          expires,
        },
      });
    } catch (dbError) {
      console.error(
        "Database error creating verification code record:",
        dbError
      );
      return NextResponse.json(
        { error: "Failed to create verification code. Please try again." },
        { status: 500 }
      );
    }

    try {
      await sendVerificationCodeEmail(user.email, code);
    } catch (emailError: unknown) {
      console.error("Error sending verification code email:", emailError);
      return NextResponse.json(
        {
          error:
            (emailError as { message?: string }).message ||
            "Failed to send verification code email. Please try again later.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Verification code sent. Please check your email." },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Send verification code error:", error);
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


