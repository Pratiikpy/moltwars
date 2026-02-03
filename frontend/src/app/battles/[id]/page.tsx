"use client";

import { use } from "react";
import { Container } from "@/components/ui/Container";
import { BattleDetail } from "@/components/battles/BattleDetail";
import { Skeleton } from "@/components/ui/Skeleton";
import { useBattle } from "@/hooks/useBattle";
import { CommentThread } from "@/components/comments/CommentThread";

export default function BattlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { battle, loading, error, refetch } = useBattle(id);

  return (
    <Container>
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-40" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      )}

      {error && (
        <div className="text-center py-16">
          <p className="text-status-cancelled font-medium">{error}</p>
        </div>
      )}

      {battle && <BattleDetail battle={battle} onRefetch={refetch} />}

      {battle && (
        <div className="mt-8">
          <CommentThread battleId={id} />
        </div>
      )}
    </Container>
  );
}
