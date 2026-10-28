"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import LimitationBlock from "@/components/registry/LimitationBlock";
import { useHamper } from "@/lib/useHamper";
import type { ListData, WishData, GiftData } from "@/lib/hamper";
import { formatEtherClean, fillPercent, formatTimeLocal } from "@/lib/hamper";

export default function HostManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const listId = BigInt(resolvedParams.id);

  const {
    fetchList,
    fetchWishes,
    fetchGifts,
    fetchBlockTimestamp,
    claimWish,
    address,
    isTransacting,
  } = useHamper();

  const [list, setList] = useState<ListData | null>(null);
  const [wishes, setWishes] = useState<WishData[]>([]);
  const [wishGifts, setWishGifts] = useState<Record<number, GiftData[]>>({});
  const [nowSec, setNowSec] = useState<number>(() => Math.floor(Date.now() / 1000));
  const [loading, setLoading] = useState(true);
  const [claimingIndex, setClaimingIndex] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (listId <= 0n) return;
    setLoading(true);
    try {
      const [blockTime, listData, wishesData] = await Promise.all([
        fetchBlockTimestamp(),
        fetchList(listId),
        fetchWishes(listId),
      ]);

      if (blockTime) setNowSec(blockTime);
      if (listData) setList(listData);
      if (wishesData) {
        setWishes(wishesData);

        const giftsMap: Record<number, GiftData[]> = {};
        await Promise.all(
          wishesData.map(async (w) => {
            const gifts = await fetchGifts(listId, w.index, 0n, 50n);
            if (gifts) giftsMap[w.index] = gifts;
          })
        );
        setWishGifts(giftsMap);
      }
    } catch (err) {
      console.error("Failed to load manage page:", err);
    } finally {
      setLoading(false);
    }
  }, [listId, fetchBlockTimestamp, fetchList, fetchWishes, fetchGifts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClaim = async (wishIndex: number) => {
    setClaimingIndex(wishIndex);
    try {
      await claimWish(listId, wishIndex);
      await loadData();
    } finally {
      setClaimingIndex(null);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center p-24 gap-3">
          <Spinner size={36} />
          <span className="text-xs font-mono text-[var(--text-muted)]">
            Loading host dashboard...
          </span>
        </div>
      </PageShell>
    );
  }

  if (!list) {
    return (
      <PageShell>
        <div className="rounded-3xl border-2 border-dashed border-[var(--border-default)] p-12 text-center bg-[var(--bg-surface)]">
          <h2 className="font-heading text-xl font-bold text-[var(--text-primary)]">
            Registry Not Found
          </h2>
        </div>
      </PageShell>
    );
  }

  const isHost = Boolean(address && address.toLowerCase() === list.host.toLowerCase());
  const isExpired = Number(nowSec) >= Number(list.deadline);

  return (
    <PageShell
      title={`Host Dashboard: ${list.title}`}
      description="Manage your registry, track friend contributions, and claim fully funded wishes into your till."
      action={
        <Link href={`/h/${listId.toString()}`} className="no-underline">
          <Button variant="secondary" size="sm">
            ← View Registry Shelf
          </Button>
        </Link>
      }
    >
      <div className="flex flex-col gap-8">
        {!isHost && (
          <div className="rounded-2xl border border-[#F8B4B4] bg-[#FDF2F2] p-4 text-xs text-[var(--danger)] font-medium">
            Note: You are viewing this dashboard with wallet {address || "none"}. Only the registry host ({list.host}) can claim gifts.
          </div>
        )}

        {/* Registry Summary Card */}
        <div className="rounded-3xl border-2 border-[var(--border-default)] bg-[var(--bg-surface)] p-6 sm:p-7 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
            <div>
              <span className="font-mono text-xs uppercase px-2.5 py-0.5 rounded-full bg-[#FCE8EE] text-[var(--accent)] font-semibold">
                Registry #{listId.toString()}
              </span>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-1">
                {list.title}
              </h2>
            </div>

            <div className="text-right">
              <div className="text-xs text-[var(--text-muted)]">Deadline</div>
              <div className="font-mono text-xs font-bold text-[var(--text-primary)]">
                {formatTimeLocal(list.deadline)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-center sm:text-left">
            <div>
              <div className="text-[11px] font-mono text-[var(--text-muted)] uppercase">Total Wishes</div>
              <div className="font-mono text-base font-bold text-[var(--text-primary)]">
                {wishes.length}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-mono text-[var(--text-muted)] uppercase">Claimed</div>
              <div className="font-mono text-base font-bold text-[#1F7A3D]">
                {wishes.filter((w) => w.claimed).length}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-mono text-[var(--text-muted)] uppercase">Awaiting Claim</div>
              <div className="font-mono text-base font-bold text-[var(--accent)]">
                {wishes.filter((w) => w.raised >= w.target && !w.claimed).length}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-mono text-[var(--text-muted)] uppercase">Status</div>
              <div className="font-mono text-xs font-bold text-[var(--text-primary)]">
                {isExpired ? "Closed" : "Open for gifts"}
              </div>
            </div>
          </div>
        </div>

        {/* Wish Rows for Claiming */}
        <div className="space-y-4">
          <h2 className="font-heading text-xl font-bold text-[var(--text-primary)]">
            Wishes & Claim Actions
          </h2>

          <div className="space-y-3">
            {wishes.map((w) => {
              const pct = fillPercent(w.raised, w.target);
              const isFull = w.raised >= w.target;
              const gifts = wishGifts[w.index] || [];

              return (
                <div
                  key={w.index}
                  className="rounded-2xl border border-[var(--border-default)] bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--text-muted)]">
                        Wish #{w.index + 1}
                      </span>
                      <h3 className="font-heading text-lg font-bold text-[var(--text-primary)] truncate">
                        {w.label}
                      </h3>
                      {w.claimed && (
                        <span className="px-2 py-0.5 rounded-md bg-[#E8F5E9] text-[#1F7A3D] text-[11px] font-bold">
                          Claimed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-xs font-mono text-[var(--text-secondary)]">
                      <span>
                        Raised: <strong>{formatEtherClean(w.raised)}</strong> / {formatEtherClean(w.target)} BOT ({pct}%)
                      </span>
                      <span>•</span>
                      <span>{gifts.length} {gifts.length === 1 ? "gift" : "gifts"}</span>
                    </div>

                    {/* Mini progress track */}
                    <div className="w-full max-w-md h-2 rounded-full bg-neutral-100 overflow-hidden mt-2">
                      <div
                        className="h-full bg-[var(--accent)] transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-3">
                    {w.claimed ? (
                      <span className="text-xs font-mono text-[#1F7A3D] font-semibold">
                        Funds credited to till
                      </span>
                    ) : isFull ? (
                      <Button
                        variant="ribbon"
                        size="sm"
                        disabled={!isHost || isTransacting}
                        loading={claimingIndex === w.index}
                        onClick={() => handleClaim(w.index)}
                        className="font-bold text-xs"
                      >
                        Claim {formatEtherClean(w.raised)} BOT
                      </Button>
                    ) : isExpired ? (
                      <span className="text-xs text-[#8A5A00] font-mono">
                        Underfunded (Refundable to givers)
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)] font-mono">
                        Still in progress ({pct}%)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <LimitationBlock />
      </div>
    </PageShell>
  );
}
