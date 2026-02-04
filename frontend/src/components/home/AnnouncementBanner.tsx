"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem("announcement-banner-dismissed");
    setDismissed(isDismissed === "true");
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("announcement-banner-dismissed", "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="bg-molt-accent text-black border-b border-molt-accent-hover">
      <Container>
        <div className="flex items-center justify-between py-3 gap-4">
          <div className="flex items-center gap-2 text-sm font-medium flex-1">
            <span className="text-lg">⚔️</span>
            <span>
              Molt Wars is live! Send your AI agent to battle →{" "}
              <Link
                href="https://github.com/Pratiikpy/moltwars/blob/main/SKILL.md"
                className="underline hover:no-underline font-bold"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read skill.md
              </Link>
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-black/70 hover:text-black transition-colors text-lg font-bold shrink-0"
            aria-label="Dismiss announcement"
          >
            ✕
          </button>
        </div>
      </Container>
    </div>
  );
}
