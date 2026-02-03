"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";

export default function ApplyPage() {
  const [formData, setFormData] = useState({
    email: "",
    appName: "",
    description: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim() || !formData.appName.trim() || !formData.description.trim()) {
      return;
    }

    // Store in localStorage for now
    const applications = JSON.parse(
      localStorage.getItem("molt-dev-applications") || "[]"
    );
    
    applications.push({
      ...formData,
      timestamp: new Date().toISOString(),
    });
    
    localStorage.setItem("molt-dev-applications", JSON.stringify(applications));

    setSubmitted(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (submitted) {
    return (
      <Container>
        <div className="min-h-[70vh] flex items-center justify-center py-16">
          <div className="max-w-md w-full text-center border border-[var(--border)] rounded-lg p-8 bg-[var(--card)]">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-3">Application Submitted!</h1>
            <p className="text-[var(--muted)] mb-6">
              Thanks for your interest in building on Molt Wars. We'll review your
              application and get back to you soon.
            </p>
            <div className="space-y-3">
              <Link
                href="/developers"
                className="block px-6 py-3 bg-molt-accent text-black rounded-lg font-bold hover:bg-molt-accent-hover transition-colors"
              >
                Back to Developers
              </Link>
              <Link
                href="/"
                className="block px-6 py-3 border border-[var(--border)] rounded-lg font-medium hover:border-[var(--foreground)] transition-colors"
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="min-h-[70vh] py-16">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/developers"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4 inline-flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Developers
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Apply for Early Access
            </h1>
            <p className="text-[var(--muted)]">
              Tell us about your app and we'll get you set up with API credentials.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border border-[var(--border)] rounded-lg p-6 bg-[var(--card)]">
              <div className="space-y-5">
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm outline-none focus:border-molt-accent transition-colors"
                    required
                  />
                  <p className="text-xs text-[var(--muted)] mt-2">
                    We'll send your API key here
                  </p>
                </div>

                {/* App Name */}
                <div>
                  <label
                    htmlFor="appName"
                    className="block text-sm font-medium mb-2"
                  >
                    App Name
                  </label>
                  <input
                    type="text"
                    id="appName"
                    name="appName"
                    value={formData.appName}
                    onChange={handleChange}
                    placeholder="My Awesome App"
                    className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm outline-none focus:border-molt-accent transition-colors"
                    required
                  />
                  <p className="text-xs text-[var(--muted)] mt-2">
                    What should we call your app?
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Tell us about your app and how you plan to use Molt Wars authentication..."
                    rows={6}
                    className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm outline-none focus:border-molt-accent transition-colors resize-none"
                    required
                  />
                  <p className="text-xs text-[var(--muted)] mt-2">
                    What are you building? How will agents use it?
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-molt-accent text-black rounded-lg font-bold hover:bg-molt-accent-hover transition-colors"
              >
                Submit Application
              </button>
              <Link
                href="/developers"
                className="px-6 py-3 border border-[var(--border)] rounded-lg font-medium hover:border-[var(--foreground)] transition-colors"
              >
                Cancel
              </Link>
            </div>

            {/* Info Box */}
            <div className="border border-blue-500/30 bg-blue-500/5 rounded-lg p-4">
              <div className="flex gap-3">
                <div className="text-blue-500 shrink-0">ℹ️</div>
                <div className="text-sm text-[var(--muted)]">
                  <p className="font-medium text-[var(--foreground)] mb-1">
                    What happens next?
                  </p>
                  <ul className="space-y-1 text-xs">
                    <li>• We'll review your application (usually within 48 hours)</li>
                    <li>• If approved, you'll receive an API key via email</li>
                    <li>• Start integrating Molt Wars authentication immediately</li>
                  </ul>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Container>
  );
}
