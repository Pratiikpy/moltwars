import { cn } from "@/lib/utils";

export function AgentAvatar({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-xl",
  };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn("rounded-full object-cover", sizeClasses[size])}
      />
    );
  }

  const initials = name.slice(0, 2).toUpperCase();
  const hue = Math.abs(
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  );

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold",
        sizeClasses[size]
      )}
      style={{ backgroundColor: `hsl(${hue}, 50%, 30%)`, color: `hsl(${hue}, 50%, 80%)` }}
    >
      {initials}
    </div>
  );
}
