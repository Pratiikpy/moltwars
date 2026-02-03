export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="text-center py-16">
      <p className="text-lg font-medium text-[var(--muted)]">{title}</p>
      {description && (
        <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
      )}
    </div>
  );
}
