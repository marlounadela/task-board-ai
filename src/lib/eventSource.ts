/**
 * EventSource wrapper with automatic reconnection and better error handling
 * for cross-browser compatibility (Firefox, DuckDuckGo, Chrome, etc.)
 */

export interface EventSourceOptions {
  url: string;
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: (event: Event) => void;
  maxReconnectAttempts?: number;
  initialReconnectDelay?: number;
  maxReconnectDelay?: number;
}

export class ReconnectingEventSource {
  private es: EventSource | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isManuallyClosed = false;
  private options: {
    url: string;
    onMessage?: (event: MessageEvent) => void;
    onError?: (error: Event) => void;
    onOpen?: (event: Event) => void;
    maxReconnectAttempts: number;
    initialReconnectDelay: number;
    maxReconnectDelay: number;
  };

  constructor(options: EventSourceOptions) {
    this.options = {
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
      initialReconnectDelay: options.initialReconnectDelay ?? 1000,
      maxReconnectDelay: options.maxReconnectDelay ?? 30000,
      url: options.url,
      onMessage: options.onMessage,
      onError: options.onError,
      onOpen: options.onOpen,
    };
    this.connect();
  }

  private connect() {
    if (this.isManuallyClosed) return;

    try {
      // Close existing connection if any
      if (this.es) {
        this.es.close();
      }

      this.es = new EventSource(this.options.url);

      this.es.onopen = (event) => {
        // Reset reconnect attempts on successful connection
        this.reconnectAttempts = 0;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        this.options.onOpen?.(event);
      };

      this.es.onmessage = (event) => {
        // Only process data events, ignore comments (heartbeats)
        if (event.data && !event.data.startsWith(":")) {
          this.options.onMessage?.(event);
        }
      };

      this.es.onerror = (error) => {
        const readyState = this.es?.readyState;

        // CONNECTING = 0, OPEN = 1, CLOSED = 2
        if (readyState === EventSource.CLOSED) {
          // Connection closed, attempt to reconnect
          this.handleReconnect();
        } else if (readyState === EventSource.CONNECTING) {
          // Still connecting, wait a bit before deciding to reconnect
          // Some browsers (Firefox) may briefly show CONNECTING state during reconnection
          setTimeout(() => {
            if (this.es?.readyState === EventSource.CLOSED && !this.isManuallyClosed) {
              this.handleReconnect();
            }
          }, 2000);
        }

        this.options.onError?.(error);
      };
    } catch (error) {
      console.error("Failed to create EventSource:", error);
      this.handleReconnect();
    }
  }

  private handleReconnect() {
    if (this.isManuallyClosed) return;
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached for EventSource");
      return;
    }

    // Exponential backoff with jitter
    const baseDelay = Math.min(
      this.options.initialReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.options.maxReconnectDelay
    );
    const jitter = Math.random() * 1000; // Add random 0-1s jitter
    const delay = baseDelay + jitter;

    this.reconnectAttempts++;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      console.log(`Reconnecting EventSource (attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts})...`);
      this.connect();
    }, delay);
  }

  public close() {
    this.isManuallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.es) {
      this.es.close();
      this.es = null;
    }
  }

  public get readyState(): number {
    return this.es?.readyState ?? EventSource.CLOSED;
  }
}

