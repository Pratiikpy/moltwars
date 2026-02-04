"use client";

import { useEffect, useRef, useState } from "react";
import { connectSSE } from "@/lib/sse";

interface StreamEvent {
  type: string;
  data: unknown;
  timestamp: number;
}

export function useBattleStream(
  battleId: string,
  onEvent?: (type: string, data: unknown) => void
) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    // Don't try to connect on the server
    if (typeof window === 'undefined') {
      return;
    }

    let disconnect: (() => void) | undefined;
    
    try {
      disconnect = connectSSE(`/battles/${battleId}/stream`, {
        onOpen: () => setConnected(true),
        onEvent: (type, data) => {
          setEvents((prev) => [...prev.slice(-50), { type, data, timestamp: Date.now() }]);
          callbackRef.current?.(type, data);
        },
        onError: () => setConnected(false),
      });
    } catch (error) {
      console.error('Failed to connect to battle stream:', error);
      setConnected(false);
    }

    return () => {
      disconnect?.();
    };
  }, [battleId]);

  return { connected, events };
}
