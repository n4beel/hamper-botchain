"use client";

import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <PageShell title="404 — Registry Shelf Not Found">
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border-2 border-dashed border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div
          className="w-16 h-16 rounded-full bg-[#FFF0F4] border border-[#F6CCD9] flex items-center justify-center text-[var(--accent)] mb-4 text-2xl"
          aria-hidden="true"
        >
          🎁
        </div>
        <h2 className="font-heading text-2xl font-bold text-[var(--text-primary)]">
          This Wish List Is Missing
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-2 max-w-sm mx-auto mb-6">
          The registry envelope you are looking for does not exist on this shelf or has been moved.
        </p>
        <Link href="/" className="no-underline">
          <Button variant="ribbon" size="md" className="font-bold">
            Back to Registry Gallery
          </Button>
        </Link>
      </div>
    </PageShell>
  );
}
