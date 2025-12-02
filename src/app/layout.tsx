import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SessionTimeoutHandler } from "@/components/SessionTimeoutHandler";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "Task Board AI - Modern Task Management with AI Assistance",
    template: "%s | Task Board AI"
  },
  description: "Boost your productivity with Task Board AI. Modern, sleek task management platform with AI-powered features for teams and individuals.",
  keywords: ["task management", "AI", "productivity", "kanban", "project management", "team collaboration"],
  authors: [{ name: "Task Board AI Team" }],
  creator: "Task Board AI",
  publisher: "Task Board AI",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://taskboard-ai.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://taskboard-ai.com",
    title: "Task Board AI - Modern Task Management with AI Assistance",
    description: "Boost your productivity with Task Board AI. Modern, sleek task management platform with AI-powered features.",
    siteName: "Task Board AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "Task Board AI - Modern Task Management with AI Assistance",
    description: "Boost your productivity with Task Board AI. Modern, sleek task management platform with AI-powered features.",
    creator: "@taskboardai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <SessionTimeoutHandler />
          {children}
        </Providers>
      </body>
    </html>
  );
}
