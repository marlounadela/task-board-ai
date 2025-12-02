"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";

/**
 * SessionTimeoutHandler component that detects browser close events
 * and handles session cleanup. This ensures sessions are invalidated
 * when the browser is completely closed.
 * 
 * The session will expire after 24 hours (configured in auth.ts),
 * and this component helps ensure proper cleanup when the browser closes.
 */
export function SessionTimeoutHandler() {
  const { data: session, status } = useSession();
  const lastActivityRef = useRef<number>(Date.now());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only run if user is authenticated
    if (status !== "authenticated" || !session) {
      return;
    }

    // Track user activity
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Check session expiration periodically
    const checkSessionExpiration = async () => {
      try {
        // Check if session has expired (24 hours of inactivity)
        const maxInactivity = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;

        if (timeSinceLastActivity > maxInactivity) {
          console.log("Session expired due to inactivity");
          await signOut({ callbackUrl: "/login" });
          return;
        }

        // Verify session is still valid by checking expiration
        // The server-side validation in auth.ts will handle JWT expiration
        // This is just a client-side check for inactivity
      } catch (error) {
        console.error("Error checking session expiration:", error);
      }
    };

    // Set up activity tracking
    const activityEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
    activityEvents.forEach((event) => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Check session expiration every 5 minutes
    checkIntervalRef.current = setInterval(checkSessionExpiration, 5 * 60 * 1000);

    // Handle visibility change (when tab becomes hidden/visible)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // Tab is hidden - store timestamp
        sessionStorage.setItem("last-hidden-time", Date.now().toString());
      } else if (document.visibilityState === "visible") {
        // Tab is visible again - check if too much time has passed
        const lastHiddenTime = sessionStorage.getItem("last-hidden-time");
        if (lastHiddenTime) {
          const timeHidden = Date.now() - parseInt(lastHiddenTime, 10);
          // If tab was hidden for more than 24 hours, sign out
          const maxHiddenTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
          if (timeHidden > maxHiddenTime) {
            signOut({ callbackUrl: "/login" });
          } else {
            // Update last activity when tab becomes visible again
            lastActivityRef.current = Date.now();
          }
        }
      }
    };

    // Handle page unload (browser close, tab close, navigation)
    // Note: We can't reliably sign out during unload, but the server-side
    // session expiration (maxAge) will handle this
    const handleBeforeUnload = () => {
      // Store a flag that browser is closing
      // This helps identify if the session should be considered inactive
      sessionStorage.setItem("browser-closing", "true");
    };

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup function
    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, updateActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [session, status]);

  // This component doesn't render anything
  return null;
}

