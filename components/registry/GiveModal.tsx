"use client";

import React, { useState } from "react";
import { parseEther } from "viem";
import Button from "@/components/ui/Button";
import { MAX_NOTE } from "@/lib/limits";
import { formatEtherClean, room } from "@/lib/hamper";

export interface GiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: bigint;
  wishIndex: number;
  wishLabel: string;
  target: bigint;
  raised: bigint;
  onGive: (wishIndex: number, amountWei: bigint, note: string) => Promise<void>;
  isPending?: boolean;
}

export default function GiveModal({
  isOpen,
  onClose,
  listId,
  wishIndex,
  wishLabel,
  target,
  raised,
  onGive,
  isPending = false,
}: GiveModalProps) {
  const [amountStr, setAmountStr] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const maxRoom = room(target, raised);
  const formattedRoom = formatEtherClean(maxRoom);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedAmount = amountStr.trim();
    if (!trimmedAmount) {
      setError("Please enter an amount to chip in.");
      return;
    }

    let parsed: bigint;
    try {
      parsed = parseEther(trimmedAmount);
    } catch {
      setError("Please enter a valid amount.");
      return;
    }

    if (parsed <= 0n) {
      setError("Amount must be greater than zero.");
      return;
    }

    if (parsed > maxRoom) {
      // Spec exact error format: "This wish needs at most {r} BOT more."
      setError(`This wish needs at most ${formattedRoom} BOT more.`);
      return;
    }

    if (note.length > MAX_NOTE) {
      setError(`Note cannot exceed ${MAX_NOTE} characters.`);
      return;
    }

    try {
      await onGive(wishIndex, parsed, note);
      setAmountStr("");
      setNote("");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  };

  const handleMaxClick = () => {
    setAmountStr(formattedRoom);
    setError(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="give-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn"
    >
      <div className="relative w-full max-w-md rounded-3xl border-2 border-[var(--border-default)] bg-[var(--bg-surface)] p-6 sm:p-7 shadow-2xl">
        {/* Ribbon decoration top edge */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-24 bg-[var(--accent)] rounded-full" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--accent)] font-bold">
              Chip In • Wish #{wishIndex + 1}
            </div>
            <h2
              id="give-modal-title"
              className="font-heading text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-0.5"
            >
              {wishLabel}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="w-8 h-8 rounded-full bg-white border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Room Notification */}
        <div className="mb-5 rounded-2xl bg-[#FFF0F4] border border-[#F6DCE4] p-3 text-xs text-[var(--text-secondary)] flex items-center justify-between">
          <span>Remaining needed:</span>
          <span className="font-mono font-bold text-[var(--text-primary)]">
            {formattedRoom} BOT
          </span>
        </div>

        {/* Give Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="give-amount" className="text-xs font-semibold text-[var(--text-primary)]">
                Your Gift (BOT)
              </label>
              <button
                type="button"
                onClick={handleMaxClick}
                className="text-[11px] font-mono text-[var(--accent)] hover:underline cursor-pointer bg-transparent border-0 p-0"
              >
                Max ({formattedRoom})
              </button>
            </div>
            <div className="relative">
              <input
                id="give-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.0"
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  setError(null);
                }}
                disabled={isPending}
                className="w-full rounded-xl border border-[var(--border-default)] bg-white px-3.5 py-2.5 font-mono text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-[var(--text-muted)]">
                BOT
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="give-note" className="text-xs font-semibold text-[var(--text-primary)]">
                Gift Note (Optional)
              </label>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                {note.length}/{MAX_NOTE}
              </span>
            </div>
            <input
              id="give-note"
              type="text"
              maxLength={MAX_NOTE}
              placeholder="With love, congratulations! 🎉"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isPending}
              className="w-full rounded-xl border border-[var(--border-default)] bg-white px-3.5 py-2.5 font-sans text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-[#FDF2F2] border border-[#F8B4B4] p-3 text-xs text-[var(--danger)] font-medium">
              {error}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="ribbon"
              size="sm"
              loading={isPending}
              className="font-bold text-xs"
            >
              Chip in for this item
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
