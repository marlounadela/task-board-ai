/**
 * Request deduplication utility to prevent duplicate API calls
 * when multiple components or tabs request the same data simultaneously
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplication {
  private pendingRequests = new Map<string, PendingRequest<unknown>>();
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private readonly CACHE_TTL = 1000; // 1 second cache TTL

  /**
   * Deduplicates requests by key. If a request with the same key is already pending,
   * returns the existing promise instead of making a new request.
   * 
   * @param key - Unique key for the request
   * @param requestFn - Function that returns a promise
   * @param useCache - Whether to use cached results (default: true)
   * @returns Promise that resolves to the request result
   */
  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>,
    useCache: boolean = true
  ): Promise<T> {
    // Check cache first
    if (useCache) {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data as T;
      }
    }

    // Check if request is already pending
    const pending = this.pendingRequests.get(key);
    if (pending) {
      // If pending request is recent (within 5 seconds), return it
      if (Date.now() - pending.timestamp < 5000) {
        return pending.promise as Promise<T>;
      }
      // Otherwise, remove stale pending request
      this.pendingRequests.delete(key);
    }

    // Create new request
    const promise = requestFn().then(
      (data) => {
        // Cache the result
        if (useCache) {
          this.cache.set(key, { data, timestamp: Date.now() });
        }
        // Remove from pending
        this.pendingRequests.delete(key);
        return data;
      },
      (error) => {
        // Remove from pending on error
        this.pendingRequests.delete(key);
        throw error;
      }
    );

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Clears the cache for a specific key or all keys
   */
  clearCache(key?: string) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Clears pending requests for a specific key or all keys
   */
  clearPending(key?: string) {
    if (key) {
      this.pendingRequests.delete(key);
    } else {
      this.pendingRequests.clear();
    }
  }
}

// Singleton instance
export const requestDeduplication = new RequestDeduplication();

