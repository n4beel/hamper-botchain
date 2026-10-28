"use client";

import React from "react";
import WishBox from "./WishBox";
import { WishData } from "@/lib/hamper";

export interface WishShelfProps {
  listId: bigint;
  wishes: WishData[];
  isExpired: boolean;
  isHost?: boolean;
  onChipIn?: (wishIndex: number) => void;
  onClaim?: (wishIndex: number) => void;
  claimPendingIndex?: number | null;
}

export default function WishShelf({
  listId,
  wishes,
  isExpired,
  isHost = false,
  onChipIn,
  onClaim,
  claimPendingIndex = null,
}: WishShelfProps) {
  if (!wishes || wishes.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-[var(--border-default)] p-12 text-center bg-[var(--bg-surface)]">
        <p className="font-heading text-lg text-[var(--text-secondary)]">
          The registry shelf is currently empty.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Registry Shelf" className="w-full">
      {/* 
        Shelf grid: 
        1 col on mobile (<640px, ensuring strictly one box per row at 360px), 
        2 cols on tablet (sm), 
        3 cols on desktop (lg).
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {wishes.map((wish) => (
          <WishBox
            key={wish.index}
            listId={listId}
            wishIndex={wish.index}
            label={wish.label}
            target={wish.target}
            raised={wish.raised}
            claimed={wish.claimed}
            isExpired={isExpired}
            isHost={isHost}
            onChipIn={onChipIn}
            onClaim={onClaim}
            claimPending={claimPendingIndex === wish.index}
          />
        ))}
      </div>
    </section>
  );
}
