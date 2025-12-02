import { EventEmitter } from "events";

// Simple in-memory pub/sub for realtime events via SSE.
// Note: This is suitable for a single server instance. For multi-instance deployments,
// replace with a shared pub/sub (e.g., Redis Pub/Sub, Pusher, Ably, etc.).

type RealtimeEventType =
  | "task_created"
  | "task_updated"
  | "task_deleted"
  | "status_changed"
  | "board_updated"
  | "activity_new"
  | "archive_changed"
  | "notification_new";

export type RealtimeEvent = {
  type: RealtimeEventType | string;
  payload?: unknown;
};

class RealtimeBus {
  private emitter = new EventEmitter();

  public publish(event: RealtimeEvent) {
    this.emitter.emit("message", event);
  }

  public subscribe(handler: (event: RealtimeEvent) => void) {
    this.emitter.on("message", handler);
    return () => {
      this.emitter.off("message", handler);
    };
  }
}

export const realtimeBus = new RealtimeBus();


