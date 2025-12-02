"use client";

import { Zap } from "lucide-react";
import React, { useState, useEffect } from "react";

type FooterProps = {
  variant?: "default" | "hero";
};

export function Footer({ variant = "default" }: FooterProps) {
  const isHero = variant === "hero";
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    // Set year on client side only to avoid hydration mismatch
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer
      className={
        isHero
          ? "relative w-screen left-1/2 -translate-x-1/2 flex-shrink-0 bg-black/20 dark:bg-black/20 border-t border-white/10 overflow-hidden"
          : "relative w-screen left-1/2 -translate-x-1/2 flex-shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 overflow-hidden"
      }
      aria-label="Website footer"
      itemScope
      itemType="https://schema.org/Organization"
      suppressHydrationWarning
    >
      {/* mirror sheen overlay */}
      <div
        className={
          isHero
            ? "pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-white/0 to-white/10"
            : "pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/0 to-slate-900/5 dark:to-white/5"
        }
      />

      {/* subtle top reflection bar */}
      <div className="absolute -top-6 left-0 right-0 h-6 opacity-40">
        <div className={isHero ? "h-full bg-gradient-to-b from-white/30 to-transparent" : "h-full bg-gradient-to-b from-white/40 to-transparent dark:from-white/10"} />
      </div>

      <div className="relative px-0 py-10">
        {/* top band full-bleed summary */}
        <div
          className={
            isHero
              ? "w-full bg-white/5 border-y border-white/10 py-4"
              : "w-full bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-700 py-4"
          }
        >
        <div className="mx-auto max-w-laptop-lg px-4 md:px-6 lg:px-8">
          <p
            className={
              isHero
                ? "text-sm text-slate-200"
                : "text-sm text-slate-700 dark:text-slate-300"
            }
            itemProp="description"
          >
            TaskBoard AI is a modern kanban and project planning platform that blends
            intuitive UX with AI assistance to help teams prioritize, execute, and ship
            faster.
          </p>
        </div>
        </div>

        {/* main content row */}
        <div className="mx-auto max-w-laptop-lg px-4 md:px-6 lg:px-8 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <div className={isHero ? "text-sm font-semibold text-white" : "text-sm font-semibold text-slate-900 dark:text-white"} itemProp="name">TaskBoard AI</div>
              <div className={isHero ? "text-xs text-slate-300" : "text-xs text-slate-500 dark:text-slate-400"}>Intelligent task management</div>
              <meta itemProp="url" content="https://taskboard-ai.com" />
            </div>
          </div>

          <nav className="flex items-center gap-6 text-sm justify-start md:justify-center" aria-label="Footer navigation">
            <a className={isHero ? "text-slate-300 hover:text-white transition-colors" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"} href="#" rel="nofollow">Privacy</a>
            <a className={isHero ? "text-slate-300 hover:text-white transition-colors" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"} href="#" rel="nofollow">Terms</a>
            <a className={isHero ? "text-slate-300 hover:text-white transition-colors" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"} href="#" rel="nofollow">Support</a>
          </nav>

          <address className={isHero ? "not-italic text-xs text-slate-300 md:text-right" : "not-italic text-xs text-slate-500 dark:text-slate-400 md:text-right"} itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
            <span itemProp="streetAddress">123 Innovation Drive</span>,
            <span> </span>
            <span itemProp="addressLocality">San Francisco</span>,
            <span> </span>
            <span itemProp="addressRegion">CA</span>
            <span> </span>
            <span itemProp="postalCode">94105</span>
          </address>
        </div>

        {/* social and badges */}
        <div className="mx-auto max-w-laptop-lg px-4 md:px-6 lg:px-8 pb-4 flex items-center justify-between gap-4 text-xs">
          <div className={isHero ? "flex items-center gap-4 text-slate-300" : "flex items-center gap-4 text-slate-500 dark:text-slate-400"} aria-label="Social links">
            <a href="#" rel="me nofollow" className={isHero ? "hover:text-white transition-colors" : "hover:text-slate-900 dark:hover:text-white transition-colors"}>Twitter</a>
            <a href="#" rel="me nofollow" className={isHero ? "hover:text-white transition-colors" : "hover:text-slate-900 dark:hover:text-white transition-colors"}>GitHub</a>
            <a href="#" rel="me nofollow" className={isHero ? "hover:text-white transition-colors" : "hover:text-slate-900 dark:hover:text-white transition-colors"}>LinkedIn</a>
          </div>
          <div className={isHero ? "flex items-center gap-2 text-slate-300" : "flex items-center gap-2 text-slate-500 dark:text-slate-400"}>
            <span>Built with Next.js & Prisma</span>
            <span>•</span>
            <span>Powered by AI</span>
          </div>
        </div>

        {/* bottom separator and copyright */}
        <div className={isHero ? "h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" : "h-px w-full bg-gradient-to-r from-transparent via-slate-300/40 to-transparent dark:via-white/15"} />
        <div className={isHero ? "mx-auto max-w-laptop-lg px-4 md:px-6 lg:px-8 py-3 text-center text-xs text-slate-300" : "mx-auto max-w-laptop-lg px-4 md:px-6 lg:px-8 py-3 text-center text-xs text-slate-500 dark:text-slate-400"} suppressHydrationWarning>
          © {currentYear ?? new Date().getFullYear()} Task Board AI — Kanban, project planning, and AI productivity.
        </div>

        {/* JSON-LD Organization schema */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'TaskBoard AI',
            url: 'https://taskboard-ai.com',
            sameAs: ['https://twitter.com/taskboardai', 'https://github.com/taskboardai'],
          }),
        }} />
      </div>
    </footer>
  );
}


