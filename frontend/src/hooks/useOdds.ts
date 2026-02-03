"use client";

import { useState, useEffect } from "react";
import type { Odds } from "@/types";
import { apiFetch } from "@/lib/api";

export function useOdds(battleId: string) {
  const [odds, setOdds] = useState<Odds | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    try {
      const data = await apiFetch<Odds>(`/battles/${battleId}/odds`);
      setOdds(data);
    } catch {
      // odds may not be available for all battles
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleId]);

  return { odds, loading, refetch };
}
