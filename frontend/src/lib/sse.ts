import { sseUrl } from "./api";

export interface SSEOptions {
  onEvent: (eventType: string, data: unknown) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
}

export function connectSSE(path: string, options: SSEOptions): () => void {
  const url = sseUrl(path);
  
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    console.warn('SSE not available in this environment');
    return () => {};
  }
  
  let source: EventSource | null = null;
  
  try {
    source = new EventSource(url);

    source.onopen = () => {
      options.onOpen?.();
    };

    source.onerror = (e) => {
      // Silently handle SSE errors - the connection will auto-retry
      options.onError?.(e);
    };

    // Handle the "message" event (default event type)
    source.onmessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        options.onEvent(data.type || 'message', data);
      } catch {
        options.onEvent('message', e.data);
      }
    };

    const eventTypes = [
      "connected",
      "battle_accepted",
      "argument_submitted",
      "round_complete",
      "voting_started",
      "vote_cast",
      "bet_placed",
      "battle_finalized",
    ];

    for (const type of eventTypes) {
      source.addEventListener(type, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          options.onEvent(type, data);
        } catch {
          options.onEvent(type, e.data);
        }
      });
    }
  } catch (error) {
    console.error('Failed to create SSE connection:', error);
    return () => {};
  }

  return () => {
    source?.close();
  };
}
