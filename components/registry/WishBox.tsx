"use client";

import React from "react";
import Button from "@/components/ui/Button";
import { fillPercent, formatEtherClean, room } from "@/lib/hamper";

export interface WishBoxProps {
  listId: bigint;
  wishIndex: number;
  label: string;
  target: bigint;
  raised: bigint;
  claimed: boolean;
  isExpired: boolean;
  isHost?: boolean;
  onChipIn?: (wishIndex: number) => void;
  onClaim?: (wishIndex: number) => void;
  claimPending?: boolean;
}

export default function WishBox({
  wishIndex,
  label,
  target,
  raised,
  claimed,
  isExpired,
  isHost = false,
  onChipIn,
  onClaim,
  claimPending = false,
}: WishBoxProps) {
  const percent = fillPercent(raised, target);
  const isFull = raised >= target;
  const remainingRoom = room(target, raised);
  const isUnderfundedExpired = isExpired && !isFull && !claimed;

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 transition-all duration-300 min-h-[340px] p-5 ${
        isFull
          ? "border-[var(--accent)] shadow-[0_8px_24px_rgba(224,69,123,0.15)]"
          : "border-[var(--border-default)] shadow-[0_4px_16px_rgba(58,29,40,0.06)]"
      } bg-[#FFFBFD]`}
      data-testid={`wish-box-${wishIndex}`}
    >
      {/* 1. Fluid Fill From The Bottom (Spec: fills from bottom with raspberry) */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none transition-all duration-700 ease-out"
        style={{
          height: `${percent}%`,
          background: isFull
            ? "linear-gradient(180deg, #E64C82 0%, #C82D65 100%)"
            : "linear-gradient(180deg, rgba(224,69,123,0.85) 0%, rgba(200,45,101,0.92) 100%)",
        }}
        aria-hidden="true"
      />

      {/* 2. Ribbon Pattern Overlay (Vertical & Horizontal Bands) */}
      <div
        className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 bg-white/30 backdrop-blur-[0.5px] border-x border-white/40 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-7 bg-white/25 backdrop-blur-[0.5px] border-y border-white/35 pointer-events-none"
        aria-hidden="true"
      />

      {/* Decorative Ribbon Bow at Top Center */}
      <div
        className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center text-[var(--accent)] drop-shadow-sm pointer-events-none"
        aria-hidden="true"
      >
        <svg className="w-10 h-7" viewBox="0 0 36 24" fill="currentColor">
          <ellipse cx="12" cy="11" rx="7" ry="4" transform="rotate(-25 12 11)" opacity="0.9" />
          <ellipse cx="24" cy="11" rx="7" ry="4" transform="rotate(25 24 11)" opacity="0.9" />
          <circle cx="18" cy="12" r="3.5" />
          <path d="M16 14 Q14 22 10 23 M20 14 Q22 22 26 23" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      {/* Top Section: Wish Title & Hanging Tag */}
      <div className="relative z-10 flex items-start justify-between gap-3 pt-4">
        {/* Wish Name & Index */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-[var(--border-subtle)] shadow-xs max-w-[55%]">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            Wish #{wishIndex + 1}
          </div>
          <div
            className="font-heading text-base font-bold text-[var(--text-primary)] truncate"
            title={label}
          >
            {label}
          </div>
        </div>

        {/* Spec: Hanging Tag with Target and Raised Amounts */}
        <div
          className="relative bg-white rounded-xl p-2.5 border-2 border-[var(--border-default)] shadow-md text-right max-w-[42%] flex-shrink-0"
          style={{ transform: "rotate(2deg)" }}
        >
          {/* Tag String & Hole */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full border border-[var(--border-strong)] bg-neutral-100 flex items-center justify-center">
            <span className="w-0.5 h-0.5 rounded-full bg-[var(--text-primary)]" />
          </div>
          <div className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-muted)]">
            Target
          </div>
          <div className="font-mono text-xs sm:text-sm font-bold text-[var(--text-primary)] leading-none my-0.5">
            {formatEtherClean(target)} <span className="text-[10px] font-normal">BOT</span>
          </div>
          <div className="text-[10px] font-mono text-[var(--text-secondary)]">
            {percent}% funded
          </div>
        </div>
      </div>

      {/* Center Section: Status Stickers & Readouts */}
      <div className="relative z-10 my-auto py-4 text-center">
        {claimed ? (
          <div className="inline-block transform -rotate-6 bg-[#1F7A3D] text-white px-4 py-2 rounded-xl border-2 border-white shadow-lg font-heading font-bold text-sm tracking-widest uppercase">
            Claimed
          </div>
        ) : isFull ? (
          <div className="inline-block transform rotate-2 bg-[var(--accent)] text-white px-4 py-2 rounded-xl border-2 border-white shadow-lg font-heading font-bold text-sm tracking-wide">
            100% Fully Funded!
          </div>
        ) : isUnderfundedExpired ? (
          <div className="inline-block bg-[#8A5A00] text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs">
            Closed · Underfunded
          </div>
        ) : (
          <div className="inline-block bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-[var(--border-subtle)] shadow-xs">
            <span className="text-xs font-mono font-medium text-[var(--text-primary)]">
              {formatEtherClean(remainingRoom)} BOT still needed
            </span>
          </div>
        )}
      </div>

      {/* Bottom Section: Progress bar badge and Action Buttons */}
      <div className="relative z-10 pt-2">
        <div className="flex items-center justify-between text-xs font-mono text-[var(--text-primary)] bg-white/85 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] mb-3">
          <span>Raised</span>
          <span className="font-bold">
            {formatEtherClean(raised)} / {formatEtherClean(target)} BOT
          </span>
        </div>

        {/* Action Controls */}
        <div>
          {claimed ? (
            <div className="text-center text-xs font-semibold text-white/95 drop-shadow-xs py-1.5">
              Fulfilled by host
            </div>
          ) : isHost && isFull ? (
            <Button
              variant="primary"
              size="sm"
              loading={claimPending}
              onClick={() => onClaim?.(wishIndex)}
              style={{ background: "#FFFFFF", color: "var(--accent-strong, #B8325F)", borderColor: "#FFFFFF" }}
              className="w-full shadow-md font-bold text-xs"
            >
              Claim this gift
            </Button>
          ) : isUnderfundedExpired ? (
            <div className="text-center text-xs font-medium text-white/95 drop-shadow-xs py-1">
              Refunds available on My Gifts
            </div>
          ) : isFull ? (
            <div className="text-center text-xs font-semibold text-white/95 drop-shadow-xs py-1">
              Awaiting host claim
            </div>
          ) : isExpired ? (
            <div className="text-center text-xs font-medium text-[var(--text-muted)] py-1">
              Deadline passed
            </div>
          ) : isHost ? (
            <div className="text-center text-xs font-medium text-[var(--text-muted)] py-1">
              Hosts can&apos;t give to their own list
            </div>
          ) : (
            <Button
              variant="ribbon"
              size="sm"
              onClick={() => onChipIn?.(wishIndex)}
              className="w-full text-xs font-bold shadow-md hover:scale-[1.01]"
            >
              Chip in for this item
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
