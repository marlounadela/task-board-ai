"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldCheck, Hash, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function VerifyCodePage() {
  const { update: updateSession } = useSession();
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = code.replace(/\s+/g, "");
    if (!/^\d{6}$/.test(trimmed)) {
      setError("Please enter a valid 6-digit code.");
      setMessage(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed. Please try again.");
        setMessage(null);
        return;
      }

      setMessage(data.message || "Email verified successfully!");
      setError(null);

      // Refresh the NextAuth session to reflect the verified status
      try {
        if (updateSession) {
          await updateSession();
        }
      } catch (sessionError) {
        console.error("Error updating session:", sessionError);
        // Non-fatal, continue with redirect
      }

      // Dispatch a custom event to notify other components (like EditProfileModal)
      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("email-verified", {
            detail: { verified: true }
          }));
        }
      } catch {}

      // Give the user a moment to read then refresh
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
      }, 2500);
    } catch (err) {
      console.error("Error verifying code:", err);
      setError("An unexpected error occurred. Please try again.");
      setMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ||
            "Failed to send a new verification code. Please try again."
        );
        setMessage(null);
        return;
      }

      setMessage(data.message || "A new verification code was sent.");
    } catch (err) {
      console.error("Error resending verification code:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShieldCheck className="w-16 h-16 text-purple-300" />
          </div>
          <CardTitle className="text-3xl font-bold text-white mb-2">
            Enter Verification Code
          </CardTitle>
          <CardDescription className="text-slate-300">
            We sent a 6-digit code to your email after signing up with Google.
            Enter it below to verify your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-100 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-100 text-sm rounded-lg px-3 py-2">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="code"
                className="text-sm font-medium text-slate-100"
              >
                6-digit code
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-500 tracking-[0.35em] text-center text-lg"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2.5 transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify account"
              )}
            </Button>
          </form>

          <div className="flex items-center justify-between text-sm text-slate-300">
            <button
              type="button"
              onClick={handleResend}
              disabled={isSubmitting}
              className="underline underline-offset-4 hover:text-slate-100 disabled:opacity-60"
            >
              Resend code
            </button>

            <Link
              href="/"
              className="inline-flex items-center hover:text-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


