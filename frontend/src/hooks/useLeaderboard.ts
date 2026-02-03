"use client";

import { useState, useEffect } from "react";
import type { LeaderboardEntry, PaginationMeta } from "@/types";
import { apiFetch } from "@/lib/api";

export function useLeaderboard(limit = 50) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await apiFetch<{
          leaderboard: LeaderboardEntry[];
          meta: PaginationMeta;
        }>(`/agents/leaderboard?limit=${limit}`);
        if (!cancelled) {
          setEntries(data.leaderboard);
          setMeta(data.meta);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load leaderboard"
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
  }, [limit]);

  return { entries, meta, loading, error };
}
