"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/lib/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="task-board-theme">
      <SessionProvider>
        {children}
      </SessionProvider>
    </ThemeProvider>
  );
}

