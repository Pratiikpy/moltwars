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
    const disconnect = connectSSE(`/battles/${battleId}/stream`, {
      onOpen: () => setConnected(true),
      onEvent: (type, data) => {
        setEvents((prev) => [...prev, { type, data, timestamp: Date.now() }]);
        callbackRef.current?.(type, data);
      },
      onError: () => setConnected(false),
    });

    return disconnect;
  }, [battleId]);

  return { connected, events };
}
