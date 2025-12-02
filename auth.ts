import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";

// Import the shared prisma instance
import { prisma } from "@/lib/prisma";
import { sendVerificationCodeEmail } from "@/lib/email";

// Validate required environment variables
const requiredEnvVars = {
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
};

// Check for missing required environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

// Check for NEXTAUTH_URL when Google OAuth is configured
const hasGoogleOAuth = process.env.GOOGLE_CLIENT_ID && 
                       process.env.GOOGLE_CLIENT_SECRET &&
                       process.env.GOOGLE_CLIENT_ID !== "your-google-client-id" &&
                       process.env.GOOGLE_CLIENT_SECRET !== "your-google-client-secret";

// Validate configuration before creating NextAuth instance
// CRITICAL: We must prevent NextAuth from initializing with invalid config
// Otherwise it will throw a generic "Configuration" error that's hard to debug
let configError: Error | null = null;

if (process.env.NODE_ENV !== "test") {
  // Check for missing required variables - ALWAYS throw in all environments
  // This prevents NextAuth from initializing with invalid configuration
  if (missingVars.length > 0) {
    const errorMsg = 
      `\n❌ CRITICAL: Missing required environment variables: ${missingVars.join(", ")}\n` +
      `\nPlease add these to your .env file:\n` +
      missingVars.map(key => {
        if (key === "DATABASE_URL") return `DATABASE_URL="file:./prisma/dev.db"`;
        if (key === "NEXTAUTH_SECRET") return `NEXTAUTH_SECRET="your-secret-here" (generate with: openssl rand -base64 32)`;
        return `${key}="your-value-here"`;
      }).join("\n") +
      `\n\nRun this command to verify your configuration:\n` +
      `node scripts/check-auth-config.js\n` +
      `\nWithout these, NextAuth will fail with a configuration error.\n`;
    console.error(errorMsg);
    // Store error to prevent NextAuth initialization
    configError = new Error(`Missing required environment variables: ${missingVars.join(", ")}. Check server logs for details.`);
  }

  // Check for NEXTAUTH_URL when Google OAuth is configured
  if (hasGoogleOAuth && !process.env.NEXTAUTH_URL) {
    const errorMsg = 
      `\n❌ CRITICAL: NEXTAUTH_URL is required for Google OAuth but is not set!\n` +
      `\nPlease add to your .env file:\n` +
      `NEXTAUTH_URL=http://localhost:5000\n` +
      `\nWithout this, OAuth will fail with a server configuration error.\n` +
      `Even though trustHost is enabled, NextAuth v5 still requires NEXTAUTH_URL for OAuth.\n`;
    console.error(errorMsg);
    // Store error to prevent NextAuth initialization
    configError = new Error("NEXTAUTH_URL is required for Google OAuth. Check server logs for details.");
  }
}

// Only initialize NextAuth if configuration is valid
// If there's a config error, create error handlers instead
let auth: any;
let handlers: any;

if (configError) {
  // Create error handlers that return proper error responses
  const errorHandler = async (req: Request) => {
    return new Response(
      JSON.stringify({
        error: "Configuration",
        message: configError?.message || "NextAuth configuration error",
        details: process.env.NODE_ENV === "development" 
          ? "Check server console logs for detailed error messages."
          : undefined
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  };
  
  handlers = {
    GET: errorHandler,
    POST: errorHandler,
  };
  
  // Create a dummy auth function that throws
  auth = () => {
    throw configError!;
  };
  
  // Don't throw - let the error handlers return proper responses
  // This allows the module to load and return error responses instead of crashing
} else {
  // Configuration is valid, initialize NextAuth normally
  try {
    const nextAuthResult = NextAuth({
    adapter: PrismaAdapter(prisma),
    trustHost: true, // Allows NextAuth to detect the host from the request
    // Note: Even with trustHost, NEXTAUTH_URL is still required for OAuth in NextAuth v5
    session: { 
      strategy: "jwt",
      // Session expires after 24 hours of inactivity or when browser is closed
      maxAge: 24 * 60 * 60, // 24 hours in seconds
    },
    pages: {
      signIn: "/login",
    },
  // Secret is validated above - if missing, we throw before reaching here
  // Only use fallback in development if somehow we get here (shouldn't happen)
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || (process.env.NODE_ENV === "development" ? "fallback-secret-for-development-only" : undefined),
  // Note: NEXTAUTH_URL should match your dev server port (5000) or production URL
  // For OAuth providers, ensure redirect URIs match NEXTAUTH_URL
  providers: [
    // Only add Google provider if credentials are properly configured
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && 
        process.env.GOOGLE_CLIENT_ID !== "your-google-client-id" && 
        process.env.GOOGLE_CLIENT_SECRET !== "your-google-client-secret" 
        ? [GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: "select_account", // Show account selection
                access_type: "offline",
                response_type: "code"
              }
            }
          })]
        : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }
          
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user || !user.password) {
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isValid) {
            return null;
          }

          return { id: user.id, email: user.email, name: user.name };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // PrismaAdapter automatically handles user creation/update for OAuth providers
      // Only need to handle errors here
      if (account?.provider === "google") {
        try {
          // Verify user has email (required)
          if (!user.email) {
            console.error("Google OAuth: User email is missing");
            return false;
          }

          // Verify database connection is working
          try {
            await prisma.$connect();
          } catch (dbError) {
            console.error("Database connection error during OAuth:", dbError);
            return false;
          }

          // For Google OAuth users, require a 6-digit verification code sent by email
          try {
            const dbUser = await prisma.user.findUnique({
              where: { email: user.email },
              select: { id: true, emailVerified: true, email: true },
            });

            if (dbUser && !dbUser.emailVerified) {
              // Generate a 6-digit numeric code (as a zero-padded string)
              const code = randomInt(0, 1_000_000).toString().padStart(6, "0");

              const expires = new Date();
              // Code expires in 10 minutes
              expires.setMinutes(expires.getMinutes() + 10);

              // Remove any existing codes/tokens for this user
              await prisma.emailVerificationToken.deleteMany({
                where: { userId: dbUser.id },
              });

              // Store the code for this user
              await prisma.emailVerificationToken.create({
                data: {
                  userId: dbUser.id,
                  code,
                  expires,
                },
              });

              // Ensure Gmail sender is configured before attempting to send
              if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
                console.warn(
                  "GMAIL_USER / GMAIL_APP_PASSWORD are not set; cannot send Google verification code email."
                );
              } else {
                try {
                  await sendVerificationCodeEmail(dbUser.email, code);
                  console.log(
                    "Google OAuth: Verification code email sent to:",
                    dbUser.email
                  );
                } catch (emailError) {
                  console.error(
                    "Google OAuth: Failed to send verification code email:",
                    emailError
                  );
                  // Do not block sign-in if email sending fails; user can request a new code later
                }
              }
            }
          } catch (verifyError) {
            console.error(
              "Error creating/sending Google verification code:",
              verifyError
            );
            // Don't fail sign-in if verification code flow fails
          }

          console.log("Google OAuth sign-in successful for:", user.email);
        } catch (error) {
          console.error("Error during Google sign-in callback:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      // Initial sign in - user object is available
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        
        // Set session expiration timestamp (24 hours from now)
        const maxAge = 24 * 60 * 60; // 24 hours in seconds
        token.exp = Math.floor(Date.now() / 1000) + maxAge;
        token.iat = Math.floor(Date.now() / 1000);
        
        // For OAuth providers, fetch user from database to ensure we have the correct ID
        // This is needed because PrismaAdapter creates the user, and we need the database ID
        if (account?.provider === "google" && user.email) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { email: user.email },
              select: { id: true, name: true, email: true, image: true },
            });
            if (dbUser) {
              token.id = dbUser.id;
              token.email = dbUser.email;
              token.name = dbUser.name ?? undefined;
              token.picture = dbUser.image ?? undefined;
              console.log("JWT callback: User data updated from database for:", dbUser.email);
            } else {
              console.warn("JWT callback: User not found in database for:", user.email);
            }
          } catch (error) {
            console.error("Error fetching user in JWT callback:", error);
            // Don't fail the auth, but log the error
          }
        }
      }
      
      // Check if token has expired
      if (token.exp && token.exp < Math.floor(Date.now() / 1000)) {
        console.log("JWT token has expired");
        return { ...token, expired: true };
      }
      
      // Store access token if available (only on initial sign-in)
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Check if token has expired
      if (token.exp && token.exp < Math.floor(Date.now() / 1000)) {
        console.log("Session expired - returning null session");
        return { ...session, expires: new Date(0).toISOString() };
      }
      
      // Add user ID and other data to session
      if (session.user && token) {
        if (!token.id) {
          console.error("Session callback: Token ID is missing");
        }
        session.user.id = token.id as string;
        // Update session with token data if available
        if (token.email) {
          session.user.email = token.email as string;
        }
        if (token.name) {
          session.user.name = token.name as string;
        }
        if (token.picture) {
          session.user.image = token.picture as string;
        }
      }
      return session;
    },
  },
  });
  
    auth = nextAuthResult.auth;
    handlers = nextAuthResult.handlers;
  } catch (initError: any) {
    // Catch NextAuth initialization errors (e.g., PrismaAdapter issues)
    console.error("❌ NextAuth initialization failed:", initError.message);
    console.error("\nTroubleshooting:");
    console.error("1. Verify database connection: node scripts/test-db-connection.js");
    console.error("2. Run migrations: npx prisma migrate deploy");
    console.error("3. Generate Prisma client: npx prisma generate");
    console.error("4. Check Prisma schema matches database structure");
    
    // Create error handlers
    const errorHandler = async (req: Request) => {
      return new Response(
        JSON.stringify({
          error: "Configuration",
          message: "NextAuth initialization failed. Check server logs for details.",
          details: process.env.NODE_ENV === "development" 
            ? `Error: ${initError.message}\n\nRun the troubleshooting steps shown in server logs.`
            : undefined
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    };
    
    handlers = {
      GET: errorHandler,
      POST: errorHandler,
    };
    
    auth = () => {
      throw initError;
    };
  }
}

export { auth, handlers };
