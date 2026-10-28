"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import EnvelopeGallery from "@/components/registry/EnvelopeGallery";
import LimitationBlock from "@/components/registry/LimitationBlock";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { app } from "@/lib/app-config";
import { useHamper } from "@/lib/useHamper";
import type { ListData } from "@/lib/hamper";

export default function Home() {
  const { fetchLatestLists, fetchWishes, fetchBlockTimestamp } = useHamper();
  const [lists, setLists] = useState<ListData[]>([]);
  const [stats, setStats] = useState<
    Record<string, { totalRaised: bigint; totalTarget: bigint }>
  >({});
  const [nowSec, setNowSec] = useState<number>(() => Math.floor(Date.now() / 1000));
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [blockTime, latest] = await Promise.all([
        fetchBlockTimestamp(),
        fetchLatestLists(0n, 30n),
      ]);

      if (blockTime) setNowSec(blockTime);

      if (latest && latest.lists) {
        setLists(latest.lists);

        // Fetch targets and raised for each list to display summary amounts on envelopes
        const statsMap: Record<string, { totalRaised: bigint; totalTarget: bigint }> = {};
        await Promise.all(
          latest.lists.map(async (l) => {
            const wishes = await fetchWishes(l.id);
            if (wishes) {
              const totalRaised = wishes.reduce((acc, w) => acc + w.raised, 0n);
              const totalTarget = wishes.reduce((acc, w) => acc + w.target, 0n);
              statsMap[l.id.toString()] = { totalRaised, totalTarget };
            }
          })
        );
        setStats(statsMap);
      }
    } catch (err) {
      console.error("Failed to load gallery:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchBlockTimestamp, fetchLatestLists, fetchWishes]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <PageShell>
      <div className="flex flex-col gap-10">
        {/* Hero Section */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-6 border-b border-[var(--border-subtle)]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF0F4] border border-[#F6CCD9] text-xs font-semibold text-[var(--accent)] mb-3">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              <span>Registry Shelf</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
              A gift list.<br />Funded item by item.
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[var(--text-secondary)] font-sans max-w-lg leading-relaxed">
              Create a wishlist for a wedding, new baby, or farewell gift. Friends chip in any amount toward specific items. Each wish is all-or-nothing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/new" className="no-underline">
              <Button variant="ribbon" size="md" className="font-bold">
                Open A Registry
              </Button>
            </Link>
          </div>
        </div>

        {/* Gallery Section */}
        <section aria-label="Gift Registries Gallery">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-heading text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                Active Envelopes
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] font-sans">
                Browse registries and chip in toward wishes
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)]">
              {lists.length} {lists.length === 1 ? "envelope" : "envelopes"}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 gap-3">
              <Spinner size={32} />
              <span className="text-xs font-mono text-[var(--text-muted)]">
                Gathering registry envelopes...
              </span>
            </div>
          ) : (
            <EnvelopeGallery lists={lists} nowSec={nowSec} stats={stats} />
          )}
        </section>

        {/* Limitation Block (Spec: Fine print with 3 exact statements) */}
        <LimitationBlock />
      </div>
    </PageShell>
  );
}
