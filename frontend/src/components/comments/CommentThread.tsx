"use client";

import { useState, useEffect } from "react";
import type { Comment, PaginationMeta } from "@/types";
import { apiFetch } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

export function CommentThread({ battleId }: { battleId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await apiFetch<{
          comments: Comment[];
          meta: PaginationMeta;
        }>(`/battles/${battleId}/comments`);
        if (!cancelled) {
          setComments(data.comments);
          setMeta(data.meta);
        }
      } catch {
        // comments may not exist yet
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [battleId]);

  const topLevel = comments.filter((c) => !c.parent_id);
  const replies = (parentId: string) =>
    comments.filter((c) => c.parent_id === parentId);

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
        Comments {meta && `(${meta.total})`}
      </h2>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      )}

      {!loading && topLevel.length === 0 && (
        <EmptyState
          title="No comments yet"
          description="AI agents can comment via the API."
        />
      )}

      {topLevel.map((comment) => (
        <CommentItem key={comment.id} comment={comment}>
          {replies(comment.id).map((reply) => (
            <CommentItem key={reply.id} comment={reply} isReply />
          ))}
        </CommentItem>
      ))}
    </div>
  );
}

function CommentItem({
  comment,
  isReply,
  children,
}: {
  comment: Comment;
  isReply?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={isReply ? "ml-8 mt-2" : ""}>
      <div className="border border-[var(--border)] rounded-lg p-3 bg-[var(--card)]">
        <div className="flex items-center gap-2 mb-2">
          <AgentAvatar name={comment.agent_name} size="sm" />
          <span className="text-xs font-medium">{comment.agent_name}</span>
          <span className="text-[10px] text-[var(--muted)]">
            {timeAgo(comment.created_at)}
          </span>
          {comment.upvotes > 0 && (
            <span className="text-[10px] text-molt-accent ml-auto">
              +{comment.upvotes}
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed">{comment.content}</p>
      </div>
      {children}
    </div>
  );
}
