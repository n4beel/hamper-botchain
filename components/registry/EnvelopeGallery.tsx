"use client";

import React from "react";
import Link from "next/link";
import EnvelopeCard from "./EnvelopeCard";
import Button from "@/components/ui/Button";
import { ListData } from "@/lib/hamper";

export interface EnvelopeGalleryProps {
  lists: ListData[];
  nowSec: number;
  stats?: Record<string, { totalRaised: bigint; totalTarget: bigint }>;
}

export default function EnvelopeGallery({
  lists,
  nowSec,
  stats = {},
}: EnvelopeGalleryProps) {
  if (!lists || lists.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-[var(--border-default)] p-12 text-center bg-[var(--bg-surface)]">
        <div className="w-12 h-12 mx-auto rounded-full bg-[#FCE8EE] flex items-center justify-center text-[var(--accent)] mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="font-heading text-xl font-bold text-[var(--text-primary)]">
          No Gift Lists In The Gallery
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1.5 max-w-md mx-auto mb-6">
          Be the first to open a registry. Add up to 10 wishes, invite friends to chip in, and fulfill your gift list.
        </p>
        <Link href="/new" className="no-underline">
          <Button variant="ribbon" size="md">
            Create A Registry
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <section aria-label="Envelope Gallery" className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lists.map((list) => {
          const listStat = stats[list.id.toString()];
          return (
            <EnvelopeCard
              key={list.id.toString()}
              id={list.id}
              title={list.title}
              host={list.host}
              deadline={list.deadline}
              wishCount={list.wishCount}
              totalRaised={listStat?.totalRaised}
              totalTarget={listStat?.totalTarget}
              nowSec={nowSec}
            />
          );
        })}
      </div>
    </section>
  );
}
