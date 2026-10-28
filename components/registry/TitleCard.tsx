"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatDurationRemaining, formatEtherClean, formatTimeLocal } from "@/lib/hamper";

export interface TitleCardProps {
  id: bigint;
  title: string;
  host: `0x${string}`;
  deadline: bigint;
  totalRaised: bigint;
  totalTarget: bigint;
  wishesCount: number;
  claimedCount: number;
  nowSec: number;
  isHost?: boolean;
}

export default function TitleCard({
  id,
  title,
  host,
  deadline,
  totalRaised,
  totalTarget,
  wishesCount,
  claimedCount,
  nowSec,
  isHost = false,
}: TitleCardProps) {
  const [copied, setCopied] = useState(false);
  const remainingStr = formatDurationRemaining(deadline, nowSec);
  const isClosed = Number(nowSec) >= Number(deadline);

  const shortHost = `${host.slice(0, 6)}...${host.slice(-4)}`;

  const copyHost = async () => {
    try {
      await navigator.clipboard.writeText(host);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-3xl border-2 border-[var(--border-default)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-[0_6px_24px_rgba(58,29,40,0.06)]"
      data-testid="registry-title-card"
    >
      {/* Spec: Countdown Ribbon pinned to top right */}
      <div className="absolute top-0 right-0 overflow-hidden w-36 h-36 pointer-events-none">
        <div
          className={`absolute top-7 -right-10 w-44 py-1.5 text-center text-[11px] font-bold tracking-wider uppercase shadow-md text-white ${
            isClosed
              ? "bg-[#6E4655]"
              : "bg-gradient-to-r from-[var(--accent)] to-[#C73365]"
          }`}
          style={{ transform: "rotate(45deg)" }}
        >
          {remainingStr}
        </div>
      </div>

      {/* Main Title & Badges */}
      <div className="max-w-[75%] sm:max-w-[80%]">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="font-mono text-xs uppercase px-2.5 py-0.5 rounded-full bg-[#FCE8EE] text-[var(--accent)] font-semibold border border-[var(--border-subtle)]">
            Registry #{id.toString()}
          </span>
          {isHost && (
            <Link
              href={`/h/${id.toString()}/manage`}
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--accent)] no-underline transition-colors"
            >
              Host Dashboard →
            </Link>
          )}
        </div>

        <h1 className="font-heading text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight mb-3">
          {title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-[var(--text-secondary)]">
          {/* Host attribution */}
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--text-muted)]">Hosted by:</span>
            <button
              onClick={copyHost}
              className="font-mono text-xs font-semibold hover:text-[var(--accent)] underline cursor-pointer bg-transparent border-0 p-0 text-left"
              title="Click to copy full address"
            >
              {shortHost}
            </button>
            {copied && <span className="text-[10px] text-[var(--success)] font-bold">Copied!</span>}
          </div>

          <span className="hidden sm:inline text-[var(--border-default)]">•</span>

          {/* Deadline */}
          <div>
            <span className="text-[var(--text-muted)]">Deadline: </span>
            <span className="font-mono text-xs font-semibold">
              {formatTimeLocal(deadline)}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            Total Raised
          </div>
          <div className="font-mono text-lg font-bold text-[var(--text-primary)]">
            {formatEtherClean(totalRaised)} <span className="text-xs font-normal">BOT</span>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            Total Target
          </div>
          <div className="font-mono text-lg font-bold text-[var(--text-primary)]">
            {formatEtherClean(totalTarget)} <span className="text-xs font-normal">BOT</span>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            Wishes on Shelf
          </div>
          <div className="font-mono text-lg font-bold text-[var(--text-primary)]">
            {wishesCount} items
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            Fulfilled & Claimed
          </div>
          <div className="font-mono text-lg font-bold text-[var(--text-primary)]">
            {claimedCount} of {wishesCount}
          </div>
        </div>
      </div>
    </div>
  );
}
