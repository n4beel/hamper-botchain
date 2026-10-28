"use client";

import React from "react";
import Link from "next/link";
import { formatDurationRemaining, formatEtherClean } from "@/lib/hamper";

export interface EnvelopeCardProps {
  id: bigint;
  title: string;
  host: `0x${string}`;
  deadline: bigint;
  wishCount: number;
  totalRaised?: bigint;
  totalTarget?: bigint;
  nowSec: number;
}

export default function EnvelopeCard({
  id,
  title,
  host,
  deadline,
  wishCount,
  totalRaised = 0n,
  totalTarget = 0n,
  nowSec,
}: EnvelopeCardProps) {
  const shortHost = `${host.slice(0, 6)}...${host.slice(-4)}`;
  const remaining = formatDurationRemaining(deadline, nowSec);
  const isClosed = Number(nowSec) >= Number(deadline);

  return (
    <Link
      href={`/h/${id.toString()}`}
      className="group block relative no-underline select-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] rounded-2xl"
      aria-label={`View registry: ${title}`}
    >
      {/* 
        Ribbon-tied envelope container:
        Layered envelope body with triangular flap styling, horizontal & vertical ribbon wrap,
        and central wax seal / bow knot.
      */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-[var(--border-default)] bg-[#FFFDFC] group-hover:border-[var(--accent)] group-hover:shadow-[0_12px_32px_rgba(224,69,123,0.14)] transition-all duration-300 min-h-[260px] p-5 flex flex-col justify-between">
        
        {/* Envelope Top Triangular Flap Graphic */}
        <div
          className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-[#FFF0F5] to-transparent pointer-events-none border-b border-[#F6DDE5]"
          style={{
            clipPath: "polygon(0 0, 100% 0, 50% 100%)",
          }}
          aria-hidden="true"
        />

        {/* Vertical Ribbon Tie */}
        <div
          className="absolute inset-y-0 left-10 w-4 bg-[#FCE6EE] border-x border-[#F6CCD9] pointer-events-none group-hover:bg-[#FADCE6] transition-colors"
          aria-hidden="true"
        />

        {/* Central Ribbon Knot / Wax Seal */}
        <div
          className="absolute top-10 left-10 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--accent)] border-2 border-white shadow-md flex items-center justify-center text-[var(--accent-ink)] pointer-events-none group-hover:scale-110 transition-transform"
          aria-hidden="true"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m-8-8h16" />
          </svg>
        </div>

        {/* Top Meta Bar */}
        <div className="relative z-10 flex items-start justify-between gap-3 pl-12 pt-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] bg-white/90 px-2.5 py-0.5 rounded-full border border-[var(--border-subtle)]">
            Hamper #{id.toString()}
          </div>

          <div
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isClosed
                ? "bg-neutral-100 text-[var(--text-muted)]"
                : "bg-[#FFF0F4] text-[var(--accent)] border border-[var(--border-subtle)]"
            }`}
          >
            {remaining}
          </div>
        </div>

        {/* Center: Title in Playfair Display (celebratory calligraphy look) */}
        <div className="relative z-10 my-4 pl-12 pr-2">
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-2 leading-snug">
            {title}
          </h2>
          <p className="font-sans text-xs text-[var(--text-secondary)] mt-1.5 flex items-center gap-1.5">
            <span>By</span>
            <span className="font-mono text-[11px] font-semibold text-[var(--text-primary)]">
              {shortHost}
            </span>
          </p>
        </div>

        {/* Bottom Envelope Footer: Wishes & Total Raised */}
        <div className="relative z-10 pl-12 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            <span>{wishCount} {wishCount === 1 ? "wish" : "wishes"}</span>
          </div>

          {totalTarget > 0n && (
            <div className="font-semibold text-[var(--text-primary)]">
              {formatEtherClean(totalRaised)} / {formatEtherClean(totalTarget)} BOT
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
