import { NextRequest } from "next/server";
import { auth } from "../../../../auth";
import { realtimeBus, type RealtimeEvent } from "@/lib/events";

export const runtime = "nodejs";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Create an AbortController to handle connection lifecycle
  const abortController = new AbortController();
  
  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;
      let heartbeat: ReturnType<typeof setInterval> | null = null;
      let unsubscribe: (() => void) | null = null;

      // Cleanup function
      const cleanup = () => {
        if (isClosed) return;
        isClosed = true;
        
        // Clear heartbeat first to prevent further enqueue attempts
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        
        // Unsubscribe from events
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        
        // Close controller only if not already closed
        try {
          // Check if we can still close (controller might already be closed)
          // We can't directly check if closed, but we can try-catch the close
          controller.close();
        } catch {
          // Controller is already closed or in invalid state - this is fine
        }
      };

      const send = (event: RealtimeEvent) => {
        if (isClosed || abortController.signal.aborted) return;
        try {
          const data = JSON.stringify(event);
          controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
        } catch {
          // Controller may be closed - stop trying to send
          cleanup();
        }
      };

      // Initial comment to open stream - required for some browsers
      try {
        controller.enqueue(new TextEncoder().encode(`: connected\n\n`));
      } catch {
        // Controller already closed or error - cleanup and exit
        cleanup();
        return;
      }

      // Heartbeat to keep connections alive across proxies
      // 30s interval for better compatibility with Firefox and DuckDuckGo
      heartbeat = setInterval(() => {
        // Check if closed first before attempting any operations
        if (isClosed || abortController.signal.aborted) {
          // Clear interval and exit
          if (heartbeat) {
            clearInterval(heartbeat);
            heartbeat = null;
          }
          return;
        }
        
        try {
          // Attempt to send heartbeat
          controller.enqueue(new TextEncoder().encode(`: heartbeat\n\n`));
        } catch {
          // Controller is closed or in invalid state
          // Clear heartbeat immediately to prevent further attempts
          if (heartbeat) {
            clearInterval(heartbeat);
            heartbeat = null;
          }
          // Mark as closed and cleanup (but don't call cleanup again if already cleaning)
          if (!isClosed) {
            cleanup();
          }
        }
      }, 30000);

      unsubscribe = realtimeBus.subscribe(send);

      // Handle abort signal
      abortController.signal.addEventListener("abort", cleanup);

      // Return cleanup function (called when stream is cancelled)
      return cleanup;
    },
    cancel() {
      // Cancel the abort controller which will trigger cleanup
      abortController.abort();
    },
  });

  // Get origin for CORS
  const origin = _req.headers.get("origin") || _req.headers.get("referer");

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // for nginx
      // CORS headers for cross-origin support (important for some browser configurations)
      ...(origin && {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Expose-Headers": "Content-Type",
      }),
    },
  });
}


