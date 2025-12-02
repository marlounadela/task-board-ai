"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");
  const success = searchParams.get("success");
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  // Handle verification from token in URL
  useEffect(() => {
    if (token && !error && !success) {
      setIsVerifying(true);
      setVerificationStatus("verifying");
      
      // The API endpoint will redirect back with success/error
      // So we just need to wait for the redirect
      window.location.href = `/api/auth/verify-email?token=${token}`;
    } else if (success === "verified") {
      setVerificationStatus("success");
      setMessage("Your email has been successfully verified!");
      // Refresh notification count after a delay
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    } else if (success === "already_verified") {
      setVerificationStatus("success");
      setMessage("Your email is already verified.");
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    } else if (error === "missing_token") {
      setVerificationStatus("error");
      setMessage("Verification token is missing. Please use the link from your email.");
    } else if (error === "invalid_token") {
      setVerificationStatus("error");
      setMessage("Invalid verification token. The link may have been used already or is incorrect.");
    } else if (error === "expired_token") {
      setVerificationStatus("error");
      setMessage("Verification token has expired. Please request a new verification email.");
    } else if (error === "server_error") {
      setVerificationStatus("error");
      setMessage("An error occurred during verification. Please try again later.");
    } else if (error === "migration_required") {
      setVerificationStatus("error");
      setMessage("Database migration required. Please contact support.");
    }
  }, [token, error, success]);

  const handleResendVerification = async () => {
    try {
      const response = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Verification email has been sent. Please check your inbox.");
        setVerificationStatus("success");
      } else {
        setMessage(data.error || "Failed to send verification email. Please try again.");
        setVerificationStatus("error");
      }
    } catch {
      setMessage("An error occurred. Please try again.");
      setVerificationStatus("error");
    }
  };

  if (isVerifying || verificationStatus === "verifying") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
          <CardContent className="pt-6">
            <div className="text-center text-white space-y-4">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-purple-400" />
              <p>Verifying your email address...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
        <CardHeader className="text-center">
          {verificationStatus === "success" ? (
            <>
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="w-16 h-16 text-green-400" />
              </div>
              <CardTitle className="text-3xl font-bold text-white mb-2">
                Email Verified!
              </CardTitle>
              <CardDescription className="text-slate-300">
                {message || "Your email has been successfully verified."}
              </CardDescription>
            </>
          ) : verificationStatus === "error" ? (
            <>
              <div className="flex justify-center mb-4">
                <XCircle className="w-16 h-16 text-red-400" />
              </div>
              <CardTitle className="text-3xl font-bold text-white mb-2">
                Verification Failed
              </CardTitle>
              <CardDescription className="text-slate-300">
                {message || "There was an error verifying your email."}
              </CardDescription>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <Mail className="w-16 h-16 text-purple-400" />
              </div>
              <CardTitle className="text-3xl font-bold text-white mb-2">
                Verify Your Email
              </CardTitle>
              <CardDescription className="text-slate-300">
                Please check your email for the verification link
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {verificationStatus === "error" && (
            <div className="space-y-4">
              <Button
                onClick={handleResendVerification}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2.5 transition-all duration-200"
              >
                Resend Verification Email
              </Button>
            </div>
          )}

          {verificationStatus === "success" && (
            <div className="text-center">
              <p className="text-slate-300 mb-4">
                Redirecting you to the home page...
              </p>
              <Link href="/">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2.5 transition-all duration-200">
                  Go to Home
                </Button>
              </Link>
            </div>
          )}

          {verificationStatus === "idle" && (
            <div className="text-center space-y-4">
              <p className="text-slate-300">
                If you didn&apos;t receive the email, you can request a new verification link.
              </p>
              <Button
                onClick={handleResendVerification}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2.5 transition-all duration-200"
              >
                Resend Verification Email
              </Button>
            </div>
          )}

          <div className="text-center">
            <Link 
              href="/" 
              className="inline-flex items-center text-sm text-slate-400 hover:text-slate-300 transition-colors"
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

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
          <Card className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
            <CardContent className="pt-6">
              <div className="text-center text-white">
                <p>Loading...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}

