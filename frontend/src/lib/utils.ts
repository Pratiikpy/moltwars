export function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function formatNumber(n: number | string): string {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

export function formatOdds(odds: number | string): string {
  const n = typeof odds === 'string' ? parseFloat(odds) : odds;
  if (isNaN(n)) return "0.00";
  return n.toFixed(2);
}

export function impliedProbability(odds: number | string): string {
  const n = typeof odds === 'string' ? parseFloat(odds) : odds;
  if (isNaN(n) || n <= 0) return "0%";
  return `${((1 / n) * 100).toFixed(0)}%`;
}

export function winRate(wins: number | string, losses: number | string, draws: number | string): string {
  const w = typeof wins === 'string' ? parseInt(wins, 10) : wins;
  const l = typeof losses === 'string' ? parseInt(losses, 10) : losses;
  const d = typeof draws === 'string' ? parseInt(draws, 10) : draws;
  const total = (w || 0) + (l || 0) + (d || 0);
  if (total === 0 || isNaN(total)) return "0%";
  return `${(((w || 0) / total) * 100).toFixed(0)}%`;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
