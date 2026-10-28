import type { Log } from "viem";

export interface CreatedEvent {
  id: bigint;
  host: `0x${string}`;
  deadline: bigint;
  wishCount: number;
  title: string;
}

export interface GaveEvent {
  id: bigint;
  wish: number;
  giver: `0x${string}`;
  amount: bigint;
  note: string;
}

export interface ClaimedEvent {
  id: bigint;
  wish: number;
  amount: bigint;
}

export interface RefundedEvent {
  id: bigint;
  wish: number;
  giver: `0x${string}`;
  amount: bigint;
}

export interface WithdrawnEvent {
  user: `0x${string}`;
  amount: bigint;
}

export function parseCreatedLog(log: Log): CreatedEvent | null {
  try {
    const topics = log.topics;
    if (!topics[1] || !topics[2]) return null;
    const id = BigInt(topics[1]);
    const host = ("0x" + topics[2].slice(26)) as `0x${string}`;
    return {
      id,
      host,
      deadline: 0n,
      wishCount: 0,
      title: "",
    };
  } catch {
    return null;
  }
}

export function parseGaveLog(log: Log): GaveEvent | null {
  try {
    const topics = log.topics;
    if (!topics[1] || !topics[2] || !topics[3]) return null;
    const id = BigInt(topics[1]);
    const wish = Number(topics[2]);
    const giver = ("0x" + topics[3].slice(26)) as `0x${string}`;
    return {
      id,
      wish,
      giver,
      amount: 0n,
      note: "",
    };
  } catch {
    return null;
  }
}

export function parseClaimedLog(log: Log): ClaimedEvent | null {
  try {
    const topics = log.topics;
    if (!topics[1] || !topics[2]) return null;
    const id = BigInt(topics[1]);
    const wish = Number(topics[2]);
    return {
      id,
      wish,
      amount: 0n,
    };
  } catch {
    return null;
  }
}

export function parseRefundedLog(log: Log): RefundedEvent | null {
  try {
    const topics = log.topics;
    if (!topics[1] || !topics[2] || !topics[3]) return null;
    const id = BigInt(topics[1]);
    const wish = Number(topics[2]);
    const giver = ("0x" + topics[3].slice(26)) as `0x${string}`;
    return {
      id,
      wish,
      giver,
      amount: 0n,
    };
  } catch {
    return null;
  }
}
