import { handlers } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

// Wrap handlers to catch and log any initialization errors
async function handleRequest(
  handler: (req: NextRequest) => Promise<Response>,
  req: NextRequest
) {
  try {
    return await handler(req);
  } catch (error: unknown) {
    console.error("NextAuth handler error:", error);

    const err = error as { name?: string; message?: string };

    console.error("Error name:", err?.name);
    console.error("Error message:", err?.message);
    
    // Check if it's an UnknownAction error (NextAuth v5 API issue)
    if (
      err?.name === "UnknownAction" ||
      err?.message?.includes("UnknownAction") ||
      err?.message?.includes("Unsupported action")
    ) {
      console.error("⚠️  UnknownAction error - This might be a NextAuth v5 API compatibility issue");
      console.error("The action might not be supported in NextAuth v5 beta. Check the route and action format.");
      
      return NextResponse.json(
        {
          error: "UnknownAction",
          message: "The requested authentication action is not supported.",
          details: process.env.NODE_ENV === "development" 
            ? `Action error: ${err.message ?? "Unknown error"}. This might be a NextAuth v5 compatibility issue.`
            : undefined
        },
        { status: 400 }
      );
    }
    
    // Check if it's a configuration or initialization error
    if (
      err?.message?.includes("Configuration") || 
      err?.message?.includes("Missing required") ||
      err?.message?.includes("Prisma") ||
      err?.message?.includes("adapter")
    ) {
      
      const errorDetails = 
        "NextAuth configuration or initialization error.\n" +
        "Common causes:\n" +
        "1. Database connection failed - Run: node scripts/test-db-connection.js\n" +
        "2. Prisma migrations not applied - Run: npx prisma migrate deploy\n" +
        "3. Prisma client not generated - Run: npx prisma generate\n" +
        "4. Missing environment variables - Run: node scripts/check-auth-config.js\n" +
        `\nError: ${err.message ?? "Unknown error"}`;
      
      console.error(errorDetails);
      
      return NextResponse.json(
        {
          error: "Configuration",
          message: "There is a problem with the server configuration.",
          details: process.env.NODE_ENV === "development" ? errorDetails : undefined
        },
        { status: 500 }
      );
    }
    
    // Re-throw other errors
    throw error;
  }
}

export async function GET(req: NextRequest) {
  return handleRequest(handlers.GET, req);
}

export async function POST(req: NextRequest) {
  return handleRequest(handlers.POST, req);
}
