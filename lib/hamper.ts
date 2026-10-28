import { formatEther, parseEther } from "viem";

export interface ListData {
  id: bigint;
  host: `0x${string}`;
  deadline: bigint;
  wishCount: number;
  title: string;
}

export interface WishData {
  index: number;
  target: bigint;
  raised: bigint;
  claimed: boolean;
  label: string;
}

export interface GiftData {
  index: number;
  giver: `0x${string}`;
  amount: bigint;
  refunded: boolean;
  note: string;
}

/**
 * Computes exact integer percentage [0..100] without float maths on amounts.
 */
export function fillPercent(raised: bigint, target: bigint): number {
  if (target <= 0n || raised <= 0n) return 0;
  if (raised >= target) return 100;
  const pct = Number((raised * 100n) / target);
  return Math.min(100, Math.max(0, pct));
}

/**
 * Remaining room in a wish before reaching its target.
 */
export function room(target: bigint, raised: bigint): bigint {
  if (target <= raised) return 0n;
  return target - raised;
}

/**
 * Checks whether an underfunded wish can be refunded past the deadline.
 */
export function refundable(
  deadline: bigint,
  raised: bigint,
  target: bigint,
  claimed: boolean,
  nowSec: number | bigint
): boolean {
  const now = BigInt(nowSec);
  return now >= deadline && !claimed && raised < target;
}

/**
 * Parses target input strings into wei bigints.
 */
export function parseTargets(targetStrings: string[]): bigint[] {
  return targetStrings.map((s) => {
    const trimmed = s.trim();
    if (!trimmed) return 0n;
    try {
      return parseEther(trimmed);
    } catch {
      return 0n;
    }
  });
}

/**
 * Cleanly formats ether string removing superfluous trailing zeroes.
 */
export function formatEtherClean(wei: bigint): string {
  const val = formatEther(wei);
  if (!val.includes(".")) return val;
  const trimmed = val.replace(/\.?0+$/, "");
  return trimmed.length === 0 ? "0" : trimmed;
}

/**
 * Formats unix timestamp into local readable date.
 */
export function formatTimeLocal(unixSec: number | bigint): string {
  const date = new Date(Number(unixSec) * 1000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formats unix timestamp into UTC date.
 */
export function formatTimeUTC(unixSec: number | bigint): string {
  const date = new Date(Number(unixSec) * 1000);
  return date.toUTCString();
}

/**
 * Human-readable remaining countdown string.
 */
export function formatDurationRemaining(
  deadlineSec: number | bigint,
  nowSec: number | bigint
): string {
  const diff = Number(deadlineSec) - Number(nowSec);
  if (diff <= 0) return "Closed";

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins = Math.floor((diff % 3600) / 60);

  if (days > 1) return `${days} days left`;
  if (days === 1) return `1 day, ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}
