import { sseUrl } from "./api";

export interface SSEOptions {
  onEvent: (eventType: string, data: unknown) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
}

export function connectSSE(path: string, options: SSEOptions): () => void {
  const url = sseUrl(path);
  const source = new EventSource(url);

  source.onopen = () => {
    options.onOpen?.();
  };

  source.onerror = (e) => {
    options.onError?.(e);
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

  return () => {
    source.close();
  };
}
