"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import LimitationBlock from "@/components/registry/LimitationBlock";
import { useHamper } from "@/lib/useHamper";
import type { ListData, WishData, GiftData } from "@/lib/hamper";
import { formatEtherClean, refundable, formatTimeLocal } from "@/lib/hamper";

interface UserGiftRecord {
  listId: bigint;
  listTitle: string;
  deadline: bigint;
  wishIndex: number;
  wishLabel: string;
  giftIndex: number;
  amount: bigint;
  refunded: boolean;
  note: string;
  isRefundable: boolean;
}

export default function MePage() {
  const {
    address,
    fetchPending,
    fetchListsByHost,
    fetchList,
    fetchWishes,
    fetchGifts,
    fetchLatestLists,
    fetchBlockTimestamp,
    withdrawPending,
    refundGift,
    isTransacting,
  } = useHamper();

  const [pendingBalance, setPendingBalance] = useState<bigint | null>(null);
  const [hostedLists, setHostedLists] = useState<ListData[]>([]);
  const [userGifts, setUserGifts] = useState<UserGiftRecord[]>([]);
  const [nowSec, setNowSec] = useState<number>(() => Math.floor(Date.now() / 1000));
  const [loading, setLoading] = useState(true);
  const [refundingKey, setRefundingKey] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!address) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [blockTime, pendingAmt, hostIds, latest] = await Promise.all([
        fetchBlockTimestamp(),
        fetchPending(address),
        fetchListsByHost(address),
        fetchLatestLists(0n, 50n),
      ]);

      if (blockTime) setNowSec(blockTime);
      if (pendingAmt !== null) setPendingBalance(pendingAmt);

      // Load hosted lists
      if (hostIds && hostIds.length > 0) {
        const loaded: ListData[] = [];
        await Promise.all(
          hostIds.map(async (id) => {
            const l = await fetchList(id);
            if (l) loaded.push(l);
          })
        );
        loaded.sort((a, b) => (a.id > b.id ? -1 : 1));
        setHostedLists(loaded);
      } else {
        setHostedLists([]);
      }

      // Discover user gifts across all known lists
      const giftsFound: UserGiftRecord[] = [];
      const listsToScan = latest?.lists || [];

      await Promise.all(
        listsToScan.map(async (l) => {
          const wishes = await fetchWishes(l.id);
          if (!wishes) return;

          await Promise.all(
            wishes.map(async (w) => {
              const gifts = await fetchGifts(l.id, w.index, 0n, 50n);
              if (!gifts) return;

              const isRef = refundable(
                l.deadline,
                w.raised,
                w.target,
                w.claimed,
                blockTime || Math.floor(Date.now() / 1000)
              );

              for (const g of gifts) {
                if (g.giver.toLowerCase() === address.toLowerCase()) {
                  giftsFound.push({
                    listId: l.id,
                    listTitle: l.title,
                    deadline: l.deadline,
                    wishIndex: w.index,
                    wishLabel: w.label,
                    giftIndex: g.index,
                    amount: g.amount,
                    refunded: g.refunded,
                    note: g.note,
                    isRefundable: isRef && !g.refunded,
                  });
                }
              }
            })
          );
        })
      );

      giftsFound.sort((a, b) => (a.listId > b.listId ? -1 : 1));
      setUserGifts(giftsFound);
    } catch (err) {
      console.error("Failed to load user gifts and till:", err);
    } finally {
      setLoading(false);
    }
  }, [
    address,
    fetchBlockTimestamp,
    fetchPending,
    fetchListsByHost,
    fetchLatestLists,
    fetchList,
    fetchWishes,
    fetchGifts,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleWithdraw = async () => {
    await withdrawPending();
    await loadData();
  };

  const handleRefund = async (item: UserGiftRecord) => {
    const key = `${item.listId}-${item.wishIndex}-${item.giftIndex}`;
    setRefundingKey(key);
    try {
      await refundGift(item.listId, item.wishIndex, item.giftIndex);
      await loadData();
    } finally {
      setRefundingKey(null);
    }
  };

  return (
    <PageShell
      title="My Gifts & Till"
      description="Track the gifts you gave, refund underfunded expired wishes, and withdraw your till earnings."
    >
      <div className="flex flex-col gap-10">
        {!address && (
          <div className="rounded-3xl border-2 border-dashed border-[var(--border-default)] p-12 text-center bg-[var(--bg-surface)]">
            <h2 className="font-heading text-xl font-bold text-[var(--text-primary)]">
              Connect Your Wallet
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-1.5 max-w-sm mx-auto">
              Please connect your wallet to inspect your gifts, claims, and withdrawal balance.
            </p>
          </div>
        )}

        {address && (
          <>
            {/* 1. Till Balance & Withdrawal Section */}
            <section
              aria-label="Pending Till Balance"
              className="rounded-3xl border-2 border-[var(--border-default)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6"
            >
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
                  Your Till (Pending Balance)
                </div>
                <div className="font-mono text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)]">
                  {pendingBalance !== null ? formatEtherClean(pendingBalance) : "—"} <span className="text-lg font-normal text-[var(--text-secondary)]">BOT</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] font-sans mt-1">
                  Holds claimed registry funds or returned refunds ready for pull payment.
                </p>
              </div>

              <div>
                <Button
                  variant="ribbon"
                  size="md"
                  disabled={!pendingBalance || pendingBalance <= 0n || isTransacting}
                  loading={isTransacting}
                  onClick={handleWithdraw}
                  className="font-bold text-sm w-full sm:w-auto shadow-md"
                >
                  Withdraw to Wallet
                </Button>
              </div>
            </section>

            {/* 2. Gifts You Gave */}
            <section aria-label="Gifts You Gave">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-heading text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                    Gifts You Gave
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] font-sans">
                    Underfunded wishes are refundable after the list deadline has passed.
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)]">
                  {userGifts.length} {userGifts.length === 1 ? "gift" : "gifts"}
                </span>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center p-12 gap-3">
                  <Spinner size={32} />
                  <span className="text-xs font-mono text-[var(--text-muted)]">
                    Loading your gifts...
                  </span>
                </div>
              ) : userGifts.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border-subtle)] p-8 text-center bg-white text-xs text-[var(--text-muted)]">
                  You haven&apos;t chipped in for any wishes yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {userGifts.map((item) => {
                    const key = `${item.listId}-${item.wishIndex}-${item.giftIndex}`;
                    const isRefunding = refundingKey === key;

                    return (
                      <div
                        key={key}
                        className="rounded-2xl border border-[var(--border-default)] bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/h/${item.listId.toString()}`}
                              className="font-heading font-bold text-base text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors no-underline"
                            >
                              {item.listTitle}
                            </Link>
                            <span className="text-xs text-[var(--text-muted)]">•</span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FFF0F4] text-[var(--accent)] border border-[var(--border-subtle)]">
                              {item.wishLabel}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 text-xs font-mono text-[var(--text-secondary)]">
                            <span className="font-bold text-[var(--text-primary)]">
                              {formatEtherClean(item.amount)} BOT
                            </span>
                            <span>•</span>
                            <span>Deadline: {formatTimeLocal(item.deadline)}</span>
                          </div>

                          {item.note && (
                            <p className="font-display italic text-xs text-[var(--text-muted)] mt-1.5 pl-2 border-l-2 border-[var(--border-default)]">
                              “{item.note}”
                            </p>
                          )}
                        </div>

                        <div className="flex-shrink-0 flex items-center gap-3">
                          {item.refunded ? (
                            <span className="text-xs font-mono text-[#8A5A00] font-semibold bg-[#FFF8E6] px-2.5 py-1 rounded-full">
                              Refunded to till
                            </span>
                          ) : item.isRefundable ? (
                            <Button
                              variant="danger"
                              size="sm"
                              loading={isRefunding}
                              onClick={() => handleRefund(item)}
                              className="text-xs font-bold"
                            >
                              Refund {formatEtherClean(item.amount)} BOT
                            </Button>
                          ) : Number(nowSec) >= Number(item.deadline) ? (
                            <span className="text-xs font-mono text-[#1F7A3D]">
                              Wish funded
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-[var(--text-muted)]">
                              List open
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 3. Lists You Host */}
            <section aria-label="Lists You Host">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-heading text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                    Registries You Host
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] font-sans">
                    Manage your wish lists and claim completed gifts.
                  </p>
                </div>
                <Link href="/new" className="no-underline">
                  <Button variant="secondary" size="sm">
                    + New Registry
                  </Button>
                </Link>
              </div>

              {hostedLists.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border-subtle)] p-8 text-center bg-white text-xs text-[var(--text-muted)]">
                  You are not hosting any gift lists yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {hostedLists.map((l) => (
                    <div
                      key={l.id.toString()}
                      className="rounded-2xl border border-[var(--border-default)] bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs uppercase px-2 py-0.5 rounded-full bg-[#FFF0F4] text-[var(--accent)] font-semibold">
                            #{l.id.toString()}
                          </span>
                          <h3 className="font-heading font-bold text-base sm:text-lg text-[var(--text-primary)]">
                            {l.title}
                          </h3>
                        </div>
                        <div className="text-xs font-mono text-[var(--text-secondary)] mt-1">
                          {l.wishCount} wishes • Deadline: {formatTimeLocal(l.deadline)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <Link href={`/h/${l.id.toString()}`} className="no-underline">
                          <Button variant="secondary" size="sm">
                            View Shelf
                          </Button>
                        </Link>
                        <Link href={`/h/${l.id.toString()}/manage`} className="no-underline">
                          <Button variant="ribbon" size="sm" className="font-bold text-xs">
                            Manage & Claim
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <LimitationBlock />
      </div>
    </PageShell>
  );
}
