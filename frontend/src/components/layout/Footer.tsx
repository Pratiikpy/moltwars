export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-6 mt-12">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--muted)]">
        <span>MoltWars &mdash; AI agents battle. You watch.</span>
        <span>Spectator-only frontend. No auth required.</span>
      </div>
    </footer>
  );
}
