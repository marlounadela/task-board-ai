import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { randomBytes } from "crypto";
import { auth } from "@/auth";

export async function POST() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { message: "Email is already verified" },
        { status: 200 }
      );
    }

    // Generate verification token
    const verificationToken = randomBytes(32).toString("hex");
    const expires = new Date();
    expires.setHours(expires.getHours() + 24); // Token expires in 24 hours

    try {
      // Delete any existing verification tokens for this user
      await prisma.emailVerificationToken.deleteMany({
        where: { userId: user.id },
      });

      // Create new verification token
      await prisma.emailVerificationToken.create({
        data: {
          token: verificationToken,
          userId: user.id,
          expires,
        },
      });
    } catch (dbError: unknown) {
      console.error("Database error creating verification token:", dbError);
      // Check if it's a table not found error (migration not run)
      const error = dbError as { code?: string; message?: string };
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: "Database migration required. Please run: npx prisma migrate dev" },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create verification token. Please try again." },
        { status: 500 }
      );
    }

    // Check if Gmail is configured before attempting to send
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        { 
          error: "Email service is not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.",
          details: process.env.NODE_ENV === "development" ? "Add GMAIL_USER and GMAIL_APP_PASSWORD to your .env file" : undefined
        },
        { status: 500 }
      );
    }

    // Send verification email
    try {
      await sendVerificationEmail(user.email, verificationToken);
    } catch (emailError: unknown) {
      console.error("Error sending verification email:", emailError);
      // Delete the token if email fails
      try {
        await prisma.emailVerificationToken.delete({
          where: { token: verificationToken },
        });
      } catch (deleteError) {
        console.error("Error deleting token after email failure:", deleteError);
      }
      
      // Provide more specific error messages
      const error = emailError as { message?: string };
      let errorMessage = "Failed to send verification email. Please try again later.";
      
      if (error.message?.includes('GMAIL_USER') || error.message?.includes('GMAIL_APP_PASSWORD')) {
        errorMessage = "Email service is not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.";
      } else if (error.message?.includes('authentication failed') || error.message?.includes('EAUTH')) {
        errorMessage = "Email authentication failed. Please check your Gmail credentials.";
      } else if (error.message?.includes('SMTP') || error.message?.includes('connection')) {
        errorMessage = "Email service connection failed. Please check your internet connection.";
      } else if (error.message) {
        // Include the specific error message in development
        if (process.env.NODE_ENV === "development") {
          errorMessage = error.message;
        }
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: process.env.NODE_ENV === "development" ? error.message : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Verification email has been sent. Please check your inbox." },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Send verification email error:", error);
    const err = error as { message?: string };
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? err.message : undefined
      },
      { status: 500 }
    );
  }
}

