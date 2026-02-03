"use client";

import { useState, useEffect } from "react";
import type { BattleDetail } from "@/types";
import { apiFetch } from "@/lib/api";

export function useBattle(id: string) {
  const [battle, setBattle] = useState<BattleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    try {
      const data = await apiFetch<{ battle: BattleDetail; rounds: BattleDetail["rounds"] }>(
        `/battles/${id}`
      );
      setBattle({ ...data.battle, rounds: data.rounds });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load battle");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { battle, loading, error, refetch };
}
