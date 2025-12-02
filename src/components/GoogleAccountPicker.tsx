"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";

interface GoogleIdConfiguration {
  client_id: string;
  callback?: () => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

interface GooglePromptNotification {
  isNotDisplayed: () => boolean;
  getNotDisplayedReason: () => string | string[];
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfiguration) => void;
          prompt: (callback?: (notification: GooglePromptNotification) => void) => void;
          cancel: () => void;
        };
      };
    };
    __googleOneTapInitialized?: boolean;
    __googleOneTapActive?: boolean;
    __gsiErrorSuppressed?: boolean;
    __gsiOriginalConsoleError?: typeof console.error;
  }
}

interface GoogleAccountPickerProps {
  clientId: string;
  callbackUrl?: string;
  onAccountSelected?: () => void;
  onError?: (error: string) => void;
}

export default function GoogleAccountPicker({
  clientId,
  callbackUrl = "/",
  onAccountSelected,
  onError,
}: GoogleAccountPickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const initializedRef = useRef(false);
  const promptActiveRef = useRef(false);
  const isMountedRef = useRef(true);

  const initializeOneTap = useCallback(() => {
    if (!window.google?.accounts) return;
    
    // Prevent multiple initializations with the same client ID
    if (window.__googleOneTapInitialized) {
      // If already initialized, only show prompt if not already active and component is mounted
      if (!window.__googleOneTapActive && !promptActiveRef.current && isMountedRef.current) {
        try {
          window.__googleOneTapActive = true;
          promptActiveRef.current = true;

          window.google.accounts.id.prompt((notification: GooglePromptNotification) => {
            // Only process notification if component is still mounted
            if (!isMountedRef.current) {
              window.__googleOneTapActive = false;
              promptActiveRef.current = false;
              return;
            }
            
            window.__googleOneTapActive = false;
            promptActiveRef.current = false;

            if (notification.isNotDisplayed()) {
              const reasons = notification.getNotDisplayedReason();
              console.log("One Tap not displayed:", reasons);
            } else if (notification.isSkippedMoment()) {
              console.log("One Tap skipped");
            } else if (notification.isDismissedMoment()) {
              console.log("One Tap dismissed");
            }
          });
        } catch (promptError) {
          window.__googleOneTapActive = false;
          promptActiveRef.current = false;
          // Silently handle prompt errors (especially aborted ones)
          // AbortError and NotAllowedError are expected in certain scenarios
          if (promptError instanceof Error) {
            const errorName = promptError.name || "";
            const errorMessage = promptError.message || "";
            const isAbortError = errorName === "AbortError" || 
                                errorMessage.includes("aborted") ||
                                errorMessage.includes("signal is aborted");
            const isNotAllowedError = errorName === "NotAllowedError" ||
                                     errorMessage.includes("NotAllowedError");
            
            // Only log unexpected errors
            if (!isAbortError && !isNotAllowedError) {
              console.error("Error showing One Tap:", promptError);
            }
          }
        }
      }
      return;
    }

    try {
      // Cancel any existing prompt before initializing
      if (window.google.accounts.id.cancel) {
        try {
          window.google.accounts.id.cancel();
          window.__googleOneTapActive = false;
          promptActiveRef.current = false;
        } catch (cancelError) {
          // Ignore cancel errors
        }
      }

      // Initialize One Tap to show saved accounts
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: () => {
          // One Tap callback - but we'll use OAuth flow instead
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.__googleOneTapInitialized = true;
      initializedRef.current = true;

      // Only show prompt if no other prompt is active and component is mounted
      if (!window.__googleOneTapActive && !promptActiveRef.current && isMountedRef.current) {
        try {
          window.__googleOneTapActive = true;
          promptActiveRef.current = true;

          // Show One Tap (account picker) - displays saved accounts
          window.google.accounts.id.prompt((notification: GooglePromptNotification) => {
            // Only process notification if component is still mounted
            if (!isMountedRef.current) {
              window.__googleOneTapActive = false;
              promptActiveRef.current = false;
              return;
            }
            
            window.__googleOneTapActive = false;
            promptActiveRef.current = false;

            if (notification.isNotDisplayed()) {
              const reasons = notification.getNotDisplayedReason();
              console.log("One Tap not displayed:", reasons);
            } else if (notification.isSkippedMoment()) {
              console.log("One Tap skipped");
            } else if (notification.isDismissedMoment()) {
              console.log("One Tap dismissed");
            }
          });
        } catch (promptError) {
          window.__googleOneTapActive = false;
          promptActiveRef.current = false;
          // Silently handle prompt errors (especially aborted ones)
          // AbortError and NotAllowedError are expected in certain scenarios
          if (promptError instanceof Error) {
            const errorName = promptError.name || "";
            const errorMessage = promptError.message || "";
            const isAbortError = errorName === "AbortError" || 
                                errorMessage.includes("aborted") ||
                                errorMessage.includes("signal is aborted");
            const isNotAllowedError = errorName === "NotAllowedError" ||
                                     errorMessage.includes("NotAllowedError");
            
            // Only log unexpected errors
            if (!isAbortError && !isNotAllowedError) {
              console.error("Error showing One Tap:", promptError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error initializing One Tap:", error);
    }
  }, [clientId]);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Suppress Google Sign-In FedCM console errors
    // Use a shared suppression mechanism to avoid conflicts with multiple instances
    if (!window.__gsiErrorSuppressed) {
      const originalConsoleError = console.error;
      window.__gsiErrorSuppressed = true;
      window.__gsiOriginalConsoleError = originalConsoleError;
      
      const suppressedConsoleError = (...args: unknown[]) => {
        const errorMessage = args[0];
        if (
          typeof errorMessage === 'string' &&
          (errorMessage.includes('[GSI_LOGGER]') ||
           errorMessage.includes('FedCM get() rejects') ||
           (errorMessage.includes('AbortError') && errorMessage.includes('signal is aborted')))
        ) {
          // Suppress Google Sign-In related errors
          return;
        }
        originalConsoleError.apply(console, args);
      };
      console.error = suppressedConsoleError;
    }
    
    // Skip if already initialized by another instance
    if (initializedRef.current || window.__googleOneTapInitialized) {
      // Still need cleanup even if already initialized
      return () => {
        isMountedRef.current = false;
        // Cleanup: cancel prompt when component unmounts (only if this instance started it)
        if (promptActiveRef.current && window.google?.accounts?.id?.cancel) {
          try {
            window.google.accounts.id.cancel();
            window.__googleOneTapActive = false;
            promptActiveRef.current = false;
          } catch (cancelError) {
            // Ignore cancel errors during cleanup (AbortError is expected)
          }
        }
      };
    }

    // Load Google Identity Services script for One Tap
    if (window.google?.accounts) {
      initializeOneTap();
      // Return cleanup function
      return () => {
        isMountedRef.current = false;
        // Cleanup: cancel prompt when component unmounts
        if (promptActiveRef.current && window.google?.accounts?.id?.cancel) {
          try {
            window.google.accounts.id.cancel();
            window.__googleOneTapActive = false;
            promptActiveRef.current = false;
          } catch (cancelError) {
            // Ignore cancel errors during cleanup (AbortError is expected)
          }
        }
      };
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      // Wait for existing script to load
      existingScript.addEventListener('load', initializeOneTap);
      return () => {
        isMountedRef.current = false;
        existingScript.removeEventListener('load', initializeOneTap);
        // Cleanup: cancel prompt when component unmounts
        if (promptActiveRef.current && window.google?.accounts?.id?.cancel) {
          try {
            window.google.accounts.id.cancel();
            window.__googleOneTapActive = false;
            promptActiveRef.current = false;
          } catch (cancelError) {
            // Ignore cancel errors during cleanup (AbortError is expected)
          }
        }
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      initializeOneTap();
    };
    script.onerror = () => {
      if (onError) {
        onError("Failed to load Google Sign-In script");
      }
    };
    document.head.appendChild(script);

    return () => {
      isMountedRef.current = false;
      // Cleanup: cancel prompt when component unmounts
      if (promptActiveRef.current && window.google?.accounts?.id?.cancel) {
        try {
          window.google.accounts.id.cancel();
          window.__googleOneTapActive = false;
          promptActiveRef.current = false;
        } catch (cancelError) {
          // Ignore cancel errors during cleanup (AbortError is expected)
        }
      }
    };
  }, [clientId, initializeOneTap, onError]);

  const handleGoogleSignIn = async () => {
    // Cancel One Tap prompt when user clicks the button
    if (window.google?.accounts?.id?.cancel && promptActiveRef.current) {
      try {
        window.google.accounts.id.cancel();
        window.__googleOneTapActive = false;
        promptActiveRef.current = false;
      } catch (cancelError) {
        // Ignore cancel errors
      }
    }

    setIsLoading(true);
    
    try {
      if (onAccountSelected) {
        onAccountSelected();
      }

      // For OAuth flows in NextAuth v5, use the signIn function from next-auth/react
      // This is the recommended approach for NextAuth v5
      const { signIn } = await import("next-auth/react");
      await signIn("google", { 
        callbackUrl: callbackUrl,
        redirect: true 
      });
    } catch (error) {
      console.error("Error handling Google sign-in:", error);
      if (onError) {
        const errorMessage = error instanceof Error ? error.message : "Failed to sign in with Google";
        onError(errorMessage);
      }
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className="w-full bg-white text-slate-900 hover:bg-slate-100 transition-all duration-200"
    >
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continue with Google
    </Button>
  );
}

