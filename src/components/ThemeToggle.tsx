"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-1">
      <button
        onClick={() => setTheme("light")}
        className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center space-x-2 ${
          theme === "light"
            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        }`}
      >
        <Sun className="w-4 h-4" />
        <span>Light</span>
        {theme === "light" && (
          <div className="ml-auto w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
        )}
      </button>
      
      <button
        onClick={() => setTheme("dark")}
        className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center space-x-2 ${
          theme === "dark"
            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        }`}
      >
        <Moon className="w-4 h-4" />
        <span>Dark</span>
        {theme === "dark" && (
          <div className="ml-auto w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
        )}
      </button>
      
      <button
        onClick={() => setTheme("system")}
        className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center space-x-2 ${
          theme === "system"
            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        }`}
      >
        <Monitor className="w-4 h-4" />
        <span>System</span>
        {theme === "system" && (
          <div className="ml-auto w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
        )}
      </button>
    </div>
  );
}
