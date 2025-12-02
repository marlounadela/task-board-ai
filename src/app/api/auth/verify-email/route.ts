import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper function to get the base URL for redirects
function getBaseUrl(request: NextRequest): string {
  // Try to get from request headers (works on Vercel)
  const host = request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  
  if (host) {
    return `${protocol}://${host}`;
  }
  
  // Fallback to environment variables
  return process.env.NEXTAUTH_URL || 
         process.env.NEXT_PUBLIC_APP_URL || 
         "http://localhost:5000";
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");
    const baseUrl = getBaseUrl(request);

    if (!token) {
      return NextResponse.redirect(
        new URL("/verify-email?error=missing_token", baseUrl)
      );
    }

    // Find verification token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    // Check if token exists and is valid
    if (!verificationToken) {
      return NextResponse.redirect(
        new URL("/verify-email?error=invalid_token", baseUrl)
      );
    }

    // Check if token has expired
    if (verificationToken.expires < new Date()) {
      // Delete expired token
      await prisma.emailVerificationToken.delete({
        where: { token },
      });
      return NextResponse.redirect(
        new URL("/verify-email?error=expired_token", baseUrl)
      );
    }

    // Check if email is already verified
    if (verificationToken.user.emailVerified) {
      // Delete used token
      await prisma.emailVerificationToken.delete({
        where: { token },
      });
      return NextResponse.redirect(
        new URL("/verify-email?success=already_verified", baseUrl)
      );
    }

    // Verify email by updating user
    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: new Date() },
    });

    // Delete used verification token
    await prisma.emailVerificationToken.delete({
      where: { token },
    });

    // Also delete any email verification notifications for this user
    await prisma.notification.deleteMany({
      where: {
        userId: verificationToken.userId,
        type: "email_verification",
      },
    });

    return NextResponse.redirect(
      new URL("/verify-email?success=verified", baseUrl)
    );
  } catch (error: unknown) {
    console.error("Verify email error:", error);
    const baseUrl = getBaseUrl(request);
    
    // Check if it's a database error (table not found)
    const err = error as { code?: string; message?: string };
    if (err.code === 'P2021' || err.message?.includes('does not exist')) {
      return NextResponse.redirect(
        new URL("/verify-email?error=migration_required", baseUrl)
      );
    }
    
    return NextResponse.redirect(
      new URL("/verify-email?error=server_error", baseUrl)
    );
  }
}

