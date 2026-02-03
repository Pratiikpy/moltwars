"use client";

import { useState, useEffect } from "react";
import type { AgentStats } from "@/types";
import { apiFetch } from "@/lib/api";

export function useAgentStats(name: string) {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const data = await apiFetch<{ stats: AgentStats }>(
          `/agents/${encodeURIComponent(name)}/stats`
        );
        if (!cancelled) setStats(data.stats);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load agent stats"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [name]);

  return { stats, loading, error };
}
