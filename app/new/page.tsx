"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseEther } from "viem";
import PageShell from "@/components/layout/PageShell";
import Button from "@/components/ui/Button";
import LimitationBlock from "@/components/registry/LimitationBlock";
import { useHamper } from "@/lib/useHamper";
import {
  MIN_WISHES,
  MAX_WISHES,
  MIN_DURATION_SECS,
  MAX_DURATION_SECS,
  MAX_TITLE,
  MAX_LABEL,
} from "@/lib/limits";
import { formatEtherClean } from "@/lib/hamper";

interface WishInputRow {
  label: string;
  targetStr: string;
}

export default function NewRegistryPage() {
  const router = useRouter();
  const { createList, isTransacting, address } = useHamper();

  const [title, setTitle] = useState("");
  const [durationDays, setDurationDays] = useState(30);
  const [wishes, setWishes] = useState<WishInputRow[]>([
    { label: "", targetStr: "" },
  ]);
  const [error, setError] = useState<string | null>(null);

  const addWishRow = () => {
    if (wishes.length >= MAX_WISHES) {
      setError(`A registry can have at most ${MAX_WISHES} wishes.`);
      return;
    }
    setWishes([...wishes, { label: "", targetStr: "" }]);
    setError(null);
  };

  const removeWishRow = (index: number) => {
    if (wishes.length <= MIN_WISHES) {
      setError(`A registry must have at least ${MIN_WISHES} wish.`);
      return;
    }
    setWishes(wishes.filter((_, i) => i !== index));
    setError(null);
  };

  const updateWishRow = (index: number, field: keyof WishInputRow, val: string) => {
    const updated = [...wishes];
    updated[index] = { ...updated[index], [field]: val };
    setWishes(updated);
    setError(null);
  };

  // Compute total target sum
  let totalWei = 0n;
  for (const w of wishes) {
    const trimmed = w.targetStr.trim();
    if (trimmed) {
      try {
        const parsed = parseEther(trimmed);
        if (parsed > 0n) totalWei += parsed;
      } catch {
        // ignore invalid partial input for total preview
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!address) {
      setError("Please connect your wallet first.");
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Please provide a title for your registry.");
      return;
    }
    if (trimmedTitle.length > MAX_TITLE) {
      setError(`Title must be at most ${MAX_TITLE} characters.`);
      return;
    }

    if (wishes.length < MIN_WISHES || wishes.length > MAX_WISHES) {
      setError(`A registry must contain between ${MIN_WISHES} and ${MAX_WISHES} wishes.`);
      return;
    }

    const labels: string[] = [];
    const targets: bigint[] = [];

    for (let i = 0; i < wishes.length; i++) {
      const w = wishes[i];
      const trimmedLabel = w.label.trim();
      if (!trimmedLabel) {
        setError(`Please enter a label for Wish #${i + 1}.`);
        return;
      }
      if (trimmedLabel.length > MAX_LABEL) {
        setError(`Wish #${i + 1} label cannot exceed ${MAX_LABEL} characters.`);
        return;
      }

      const trimmedTarget = w.targetStr.trim();
      if (!trimmedTarget) {
        setError(`Please enter a target amount for Wish #${i + 1}.`);
        return;
      }

      let parsedTarget: bigint;
      try {
        parsedTarget = parseEther(trimmedTarget);
      } catch {
        setError(`Invalid target amount for Wish #${i + 1}.`);
        return;
      }

      if (parsedTarget <= 0n) {
        setError(`Target amount for Wish #${i + 1} must be greater than zero.`);
        return;
      }

      labels.push(trimmedLabel);
      targets.push(parsedTarget);
    }

    const durationSecs = BigInt(durationDays * 86400);
    if (durationSecs < BigInt(MIN_DURATION_SECS) || durationSecs > BigInt(MAX_DURATION_SECS)) {
      setError("Duration must be between 1 day and 365 days.");
      return;
    }

    try {
      const newId = await createList(trimmedTitle, labels, targets, durationSecs);
      router.push(`/h/${newId.toString()}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  };

  return (
    <PageShell
      title="Create A Registry"
      description="Set up your gift shelf with up to 10 distinct wishes, each with its own target amount."
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border-2 border-[var(--border-default)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-sm space-y-6"
        >
          {/* Registry Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="reg-title" className="text-sm font-bold text-[var(--text-primary)]">
                Registry Title
              </label>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                {title.length}/{MAX_TITLE}
              </span>
            </div>
            <input
              id="reg-title"
              type="text"
              maxLength={MAX_TITLE}
              placeholder="e.g. Maya & Leo's Wedding Registry"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isTransacting}
              className="w-full rounded-xl border border-[var(--border-default)] bg-white px-4 py-2.5 text-sm sm:text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] font-heading font-medium"
            />
          </div>

          {/* Duration Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="reg-duration" className="text-sm font-bold text-[var(--text-primary)]">
                Deadline Duration
              </label>
              <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">
                {durationDays} {durationDays === 1 ? "day" : "days"} (approx. {Math.round(durationDays / 30)} mo)
              </span>
            </div>
            <input
              id="reg-duration"
              type="range"
              min={1}
              max={365}
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              disabled={isTransacting}
              className="w-full accent-[var(--accent)] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono text-[var(--text-muted)] mt-1">
              <span>1 day min</span>
              <span>30 days</span>
              <span>90 days</span>
              <span>365 days max</span>
            </div>
          </div>

          {/* Wishes List Builder */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  Wishes On The Shelf
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  {wishes.length} of {MAX_WISHES} wishes added
                </p>
              </div>

              {wishes.length < MAX_WISHES && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addWishRow}
                  disabled={isTransacting}
                >
                  + Add Item
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {wishes.map((w, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-[var(--border-default)] shadow-xs"
                >
                  <span className="w-6 h-6 rounded-full bg-[#FFF0F4] text-[var(--accent)] text-xs font-mono font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      maxLength={MAX_LABEL}
                      placeholder="Item name (e.g. Espresso Machine)"
                      value={w.label}
                      onChange={(e) => updateWishRow(idx, "label", e.target.value)}
                      disabled={isTransacting}
                      className="w-full rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    />
                  </div>

                  <div className="w-28 sm:w-36 flex-shrink-0 relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Target"
                      value={w.targetStr}
                      onChange={(e) => updateWishRow(idx, "targetStr", e.target.value)}
                      disabled={isTransacting}
                      className="w-full rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 pr-8 text-xs sm:text-sm font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[var(--text-muted)]">
                      BOT
                    </span>
                  </div>

                  {wishes.length > MIN_WISHES && (
                    <button
                      type="button"
                      onClick={() => removeWishRow(idx)}
                      disabled={isTransacting}
                      className="w-7 h-7 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[#FDF2F2] flex items-center justify-center cursor-pointer transition-colors"
                      title="Remove wish"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totals Preview Bar */}
          <div className="rounded-2xl bg-[#FFF8FA] border border-[#F6CCD9] p-4 flex items-center justify-between text-xs sm:text-sm">
            <span className="font-semibold text-[var(--text-secondary)]">
              Total Registry Goal:
            </span>
            <span className="font-mono text-base font-bold text-[var(--accent)]">
              {formatEtherClean(totalWei)} BOT
            </span>
          </div>

          {error && (
            <div className="rounded-xl bg-[#FDF2F2] border border-[#F8B4B4] p-3 text-xs text-[var(--danger)] font-medium">
              {error}
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              variant="ribbon"
              size="lg"
              loading={isTransacting}
              className="w-full text-sm font-bold shadow-md"
            >
              Launch Gift Registry
            </Button>
          </div>
        </form>

        <LimitationBlock />
      </div>
    </PageShell>
  );
}
