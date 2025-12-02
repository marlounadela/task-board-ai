import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email?: string;
    name?: string;
    picture?: string;
    accessToken?: string;
    exp?: number; // Expiration timestamp (Unix time in seconds)
    iat?: number; // Issued at timestamp (Unix time in seconds)
    expired?: boolean; // Flag to indicate if token is expired
  }
}
