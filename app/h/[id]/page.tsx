"use client";

import { useEffect, useState, useCallback, use } from "react";
import PageShell from "@/components/layout/PageShell";
import TitleCard from "@/components/registry/TitleCard";
import WishShelf from "@/components/registry/WishShelf";
import GuestBook, { GuestBookEntry } from "@/components/registry/GuestBook";
import GiveModal from "@/components/registry/GiveModal";
import LimitationBlock from "@/components/registry/LimitationBlock";
import Spinner from "@/components/ui/Spinner";
import { useHamper } from "@/lib/useHamper";
import type { ListData, WishData } from "@/lib/hamper";

export default function RegistryViewPage({
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
    giveGift,
    claimWish,
    address,
    isTransacting,
  } = useHamper();

  const [list, setList] = useState<ListData | null>(null);
  const [wishes, setWishes] = useState<WishData[]>([]);
  const [guestGifts, setGuestGifts] = useState<GuestBookEntry[]>([]);
  const [nowSec, setNowSec] = useState<number>(() => Math.floor(Date.now() / 1000));
  const [loading, setLoading] = useState(true);

  // Give Modal State
  const [selectedWishIndex, setSelectedWishIndex] = useState<number | null>(null);
  const [claimPendingIndex, setClaimPendingIndex] = useState<number | null>(null);

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
      if (wishesData) setWishes(wishesData);

      // Fetch all gifts across wishes for the Guest Book
      if (wishesData && wishesData.length > 0) {
        const aggregated: GuestBookEntry[] = [];
        await Promise.all(
          wishesData.map(async (w) => {
            const gifts = await fetchGifts(listId, w.index, 0n, 50n);
            if (gifts) {
              for (const g of gifts) {
                aggregated.push({ ...g, wishLabel: w.label });
              }
            }
          })
        );
        setGuestGifts(aggregated);
      }
    } catch (err) {
      console.error("Failed to load registry:", err);
    } finally {
      setLoading(false);
    }
  }, [listId, fetchBlockTimestamp, fetchList, fetchWishes, fetchGifts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChipInClick = (index: number) => {
    setSelectedWishIndex(index);
  };

  const handleGiveSubmit = async (
    wishIndex: number,
    amountWei: bigint,
    note: string
  ) => {
    await giveGift(listId, wishIndex, note, amountWei);
    await loadData();
  };

  const handleClaimWish = async (wishIndex: number) => {
    setClaimPendingIndex(wishIndex);
    try {
      await claimWish(listId, wishIndex);
      await loadData();
    } finally {
      setClaimPendingIndex(null);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center p-24 gap-3">
          <Spinner size={36} />
          <span className="text-xs font-mono text-[var(--text-muted)]">
            Loading registry shelf #{listId.toString()}...
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
          <p className="text-sm text-[var(--text-muted)] mt-1.5">
            Registry #{listId.toString()} does not exist on BOT Chain.
          </p>
        </div>
      </PageShell>
    );
  }

  const isHost = Boolean(address && address.toLowerCase() === list.host.toLowerCase());
  const isExpired = Number(nowSec) >= Number(list.deadline);
  const totalRaised = wishes.reduce((acc, w) => acc + w.raised, 0n);
  const totalTarget = wishes.reduce((acc, w) => acc + w.target, 0n);
  const claimedCount = wishes.filter((w) => w.claimed).length;

  const activeWish =
    selectedWishIndex !== null && wishes[selectedWishIndex]
      ? wishes[selectedWishIndex]
      : null;

  return (
    <PageShell>
      <div className="flex flex-col gap-10">
        {/* Celebratory Title Card with Countdown Ribbon */}
        <TitleCard
          id={list.id}
          title={list.title}
          host={list.host}
          deadline={list.deadline}
          totalRaised={totalRaised}
          totalTarget={totalTarget}
          wishesCount={wishes.length}
          claimedCount={claimedCount}
          nowSec={nowSec}
          isHost={isHost}
        />

        {/* Wish Shelf: Gift Boxes filling from the bottom */}
        <section aria-label="Wishes On The Shelf">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-heading text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                Gift Shelf
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] font-sans">
                Each wish fills item by item. Fully funded gifts are fulfilled by the host.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)]">
              {wishes.length} items
            </span>
          </div>

          <WishShelf
            listId={list.id}
            wishes={wishes}
            isExpired={isExpired}
            isHost={isHost}
            onChipIn={handleChipInClick}
            onClaim={handleClaimWish}
            claimPendingIndex={claimPendingIndex}
          />
        </section>

        {/* Guest Book: Notes flowing handwritten-style */}
        <GuestBook gifts={guestGifts} />

        {/* Fine Print Limitation Block */}
        <LimitationBlock />

        {/* Give Drawer / Modal for the one transaction */}
        {activeWish && (
          <GiveModal
            isOpen={selectedWishIndex !== null}
            onClose={() => setSelectedWishIndex(null)}
            listId={list.id}
            wishIndex={activeWish.index}
            wishLabel={activeWish.label}
            target={activeWish.target}
            raised={activeWish.raised}
            onGive={handleGiveSubmit}
            isPending={isTransacting}
          />
        )}
      </div>
    </PageShell>
  );
}
