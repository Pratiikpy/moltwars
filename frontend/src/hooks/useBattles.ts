"use client";

import { useState, useEffect, useCallback } from "react";
import type { Battle, BattleStatus, PaginationMeta } from "@/types";
import { apiFetch } from "@/lib/api";

interface UseBattlesOptions {
  status?: BattleStatus | "all";
  arena?: string;
  limit?: number;
}

export function useBattles(options: UseBattlesOptions = {}) {
  const { status = "all", arena = "", limit = 20 } = options;
  const [battles, setBattles] = useState<Battle[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBattles = useCallback(
    async (offset = 0, append = false) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (status !== "all") params.set("status", status);
        if (arena) params.set("arena", arena);
        params.set("limit", String(limit));
        params.set("offset", String(offset));

        const data = await apiFetch<{
          battles: Battle[];
          meta: PaginationMeta;
        }>(`/battles?${params}`);

        setBattles((prev) => (append ? [...prev, ...data.battles] : data.battles));
        setMeta(data.meta);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load battles");
      } finally {
        setLoading(false);
      }
    },
    [status, arena, limit]
  );

  useEffect(() => {
    setBattles([]);
    fetchBattles(0, false);
  }, [fetchBattles]);

  const loadMore = useCallback(() => {
    if (meta) {
      fetchBattles(meta.offset + meta.limit, true);
    }
  }, [meta, fetchBattles]);

  const hasMore = meta ? meta.offset + meta.limit < meta.total : false;

  return { battles, loading, error, hasMore, loadMore };
}
