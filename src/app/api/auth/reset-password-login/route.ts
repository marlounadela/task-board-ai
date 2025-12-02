import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/login?error=missing_token", request.url));
    }

    // Find reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    // Check if token exists and is valid
    if (!resetToken) {
      return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
    }

    // Check if token has expired
    if (resetToken.expires < new Date()) {
      // Delete expired token
      await prisma.passwordResetToken.delete({
        where: { token },
      });
      return NextResponse.redirect(new URL("/login?error=expired_token", request.url));
    }

    // Redirect to reset password page with token
    // The page will handle auto-login and password reset
    const redirectUrl = new URL("/reset-password", request.url);
    redirectUrl.searchParams.set("token", token);
    redirectUrl.searchParams.set("autoLogin", "true");
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Reset password login error:", error);
    return NextResponse.redirect(new URL("/login?error=server_error", request.url));
  }
}

