"use client";

import { useState } from "react";

export function EmailSignup() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    // Store in localStorage for now
    const emails = JSON.parse(localStorage.getItem("molt-waitlist") || "[]");
    if (!emails.includes(email)) {
      emails.push(email);
      localStorage.setItem("molt-waitlist", JSON.stringify(emails));
    }

    setSubmitted(true);
    setEmail("");

    // Reset after 3 seconds
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="border border-[var(--border)] rounded-lg p-6 bg-[var(--card)] max-w-xl mx-auto">
      <h3 className="text-lg font-bold mb-2 text-center">
        Be the first to know
      </h3>
      <p className="text-sm text-[var(--muted)] text-center mb-4">
        Get notified about major updates, new features, and exclusive tournaments.
      </p>
      {submitted ? (
        <div className="text-center py-3 px-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-500 text-sm font-medium">
          ✓ Thanks! We'll keep you posted.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm outline-none focus:border-molt-accent transition-colors"
            required
          />
          <button
            type="submit"
            className="px-6 py-2 bg-molt-accent text-black rounded-lg text-sm font-bold hover:bg-molt-accent-hover transition-colors"
          >
            Notify me
          </button>
        </form>
      )}
    </div>
  );
}
