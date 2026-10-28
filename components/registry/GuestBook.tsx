"use client";

import React from "react";
import { GiftData, formatEtherClean } from "@/lib/hamper";

export interface GuestBookEntry extends GiftData {
  wishLabel?: string;
}

export interface GuestBookProps {
  gifts: GuestBookEntry[];
}

export default function GuestBook({ gifts }: GuestBookProps) {
  if (!gifts || gifts.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-[var(--border-default)] p-8 text-center bg-[#FFFBFD]">
        <div className="w-10 h-10 mx-auto rounded-full bg-[#FCE8EE] flex items-center justify-center text-[var(--accent)] mb-3">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h3 className="font-heading text-lg font-bold text-[var(--text-primary)]">
          The Guest Book is Empty
        </h3>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
          Be the first friend to chip in toward a wish and leave a warm note on the shelf.
        </p>
      </div>
    );
  }

  return (
    <section aria-labelledby="guest-book-heading" className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" aria-hidden="true" />
          <h2
            id="guest-book-heading"
            className="font-heading text-xl font-bold text-[var(--text-primary)] tracking-tight"
          >
            Guest Book & Notes
          </h2>
        </div>
        <span className="font-mono text-xs text-[var(--text-muted)]">
          {gifts.length} {gifts.length === 1 ? "note" : "notes"}
        </span>
      </div>

      {/* Spec: flowing, handwritten-style list (not a table) in the order given */}
      <div className="space-y-3.5">
        {gifts.map((gift, idx) => {
          const shortGiver = `${gift.giver.slice(0, 6)}...${gift.giver.slice(-4)}`;
          return (
            <div
              key={`${gift.giver}-${idx}`}
              className="relative rounded-2xl border border-[var(--border-default)] bg-[#FFFAFC] p-4 sm:p-5 shadow-[0_2px_8px_rgba(58,29,40,0.03)] hover:border-[var(--accent)] transition-all"
            >
              {/* Note Header: Giver & Gift Amount Badge */}
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[#FCE8EE] border border-[var(--border-subtle)] flex items-center justify-center font-bold text-xs text-[var(--accent)] font-mono">
                    #{idx + 1}
                  </span>
                  <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                    {shortGiver}
                  </span>
                  {gift.wishLabel && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-[var(--border-subtle)] text-[var(--text-muted)] truncate max-w-[160px]">
                      for {gift.wishLabel}
                    </span>
                  )}
                </div>

                <div className="font-mono text-xs font-bold text-[var(--accent)] bg-white px-2.5 py-1 rounded-full border border-[var(--border-subtle)] shadow-xs">
                  +{formatEtherClean(gift.amount)} BOT
                </div>
              </div>

              {/* Heartfelt Note Body (handwritten warm serif styling) */}
              {gift.note ? (
                <p className="font-display italic text-sm sm:text-base text-[var(--text-primary)] pl-2 sm:pl-3 border-l-2 border-[var(--accent)] mt-1.5 leading-relaxed">
                  “{gift.note}”
                </p>
              ) : (
                <p className="text-xs text-[var(--text-muted)] italic pl-2 mt-1">
                  (Left no note, just pure love)
                </p>
              )}

              {/* Refunded state indicator if applicable */}
              {gift.refunded && (
                <div className="mt-2 text-[11px] font-mono text-[#8A5A00] bg-[#FFF8E6] px-2 py-0.5 rounded inline-block">
                  Refunded
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
