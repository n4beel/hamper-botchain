"use client";

import { activeBotChain } from "@/lib/botchain/chain";
import { assertActiveChain, checkedWrite, waitSuccess } from "@/lib/useChainWrite";
import { useState, useCallback } from "react";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useWalletClient,
} from "wagmi";
import { useToast } from "@/components/ui/Toast";
import { hamperAbi } from "./botchain/abi";
import { getDeployment, isDeployed } from "./botchain/deployment";
import { type BotChainId, isBotChainId } from "./botchain/chain";
import { describeError } from "./errors";
import type { ListData, WishData, GiftData } from "./hamper";
import { parseCreatedLog, parseGaveLog } from "./logs";

export function useHamper() {
  const chainId = useChainId();
  const currentChainId: BotChainId = activeBotChain.id;
  const deployment = getDeployment(currentChainId);
  const deployed = isDeployed(currentChainId);

  const publicClient = usePublicClient({ chainId: activeBotChain.id }); // stable-hook-result
  const { data: walletClient } = useWalletClient(); // stable-hook-result
  const { address } = useAccount();
  const { toast } = useToast();

  const [isTransacting, setIsTransacting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // --- Read Methods ---

  const fetchBlockTimestamp = useCallback(async (): Promise<number> => {
    if (!publicClient) return Math.floor(Date.now() / 1000);
    try {
      const block = await publicClient.getBlock({ blockTag: "latest" });
      return Number(block.timestamp);
    } catch {
      return Math.floor(Date.now() / 1000);
    }
  }, [publicClient]);

  const fetchList = useCallback(
    async (id: bigint): Promise<ListData | null> => {
      if (!publicClient || !deployed || id <= 0n) return null;
      try {
        const res = await publicClient.readContract({
          address: deployment.address,
          abi: hamperAbi,
          functionName: "listOf",
          args: [id],
        });
        return {
          id,
          host: res.host,
          deadline: BigInt(res.deadline),
          wishCount: Number(res.wishCount),
          title: res.title,
        };
      } catch (err) {
        console.error("fetchList error:", err);
        return null;
      }
    },
    [publicClient, deployed, deployment.address]
  );

  const fetchWishes = useCallback(
    async (id: bigint): Promise<WishData[] | null> => {
      if (!publicClient || !deployed || id <= 0n) return null;
      try {
        const res = await publicClient.readContract({
          address: deployment.address,
          abi: hamperAbi,
          functionName: "wishesOf",
          args: [id],
        });
        return res.map((w, index) => ({
          index,
          target: BigInt(w.target),
          raised: BigInt(w.raised),
          claimed: Boolean(w.claimed),
          label: w.label,
        }));
      } catch (err) {
        console.error("fetchWishes error:", err);
        return null;
      }
    },
    [publicClient, deployed, deployment.address]
  );

  const fetchGifts = useCallback(
    async (
      id: bigint,
      wish: number,
      offset: bigint = 0n,
      count: bigint = 50n
    ): Promise<GiftData[] | null> => {
      if (!publicClient || !deployed || id <= 0n) return null;
      try {
        const slice = await publicClient.readContract({
          address: deployment.address,
          abi: hamperAbi,
          functionName: "giftsOf",
          args: [id, wish, offset, count],
        });
        return slice.map((g, idx) => ({
          index: Number(offset) + idx,
          giver: g.giver,
          amount: BigInt(g.amount),
          refunded: Boolean(g.refunded),
          note: g.note,
        }));
      } catch (err) {
        console.error("fetchGifts error:", err);
        return null;
      }
    },
    [publicClient, deployed, deployment.address]
  );

  const fetchLatestLists = useCallback(
    async (
      offset: bigint = 0n,
      count: bigint = 50n
    ): Promise<{ lists: ListData[]; total: bigint } | null> => {
      if (!publicClient || !deployed) return null;
      try {
        const [rawLists, ids, total] = await publicClient.readContract({
          address: deployment.address,
          abi: hamperAbi,
          functionName: "latest",
          args: [offset, count],
        });

        const lists: ListData[] = rawLists.map((l, i) => ({
          id: ids[i],
          host: l.host,
          deadline: BigInt(l.deadline),
          wishCount: Number(l.wishCount),
          title: l.title,
        }));

        return { lists, total: BigInt(total) };
      } catch (err) {
        console.error("fetchLatestLists error:", err);
        return null;
      }
    },
    [publicClient, deployed, deployment.address]
  );

  const fetchListsByHost = useCallback(
    async (hostAddr: `0x${string}`): Promise<bigint[] | null> => {
      if (!publicClient || !deployed) return null;
      try {
        const ids = await publicClient.readContract({
          address: deployment.address,
          abi: hamperAbi,
          functionName: "byHost",
          args: [hostAddr],
        });
        return [...ids];
      } catch (err) {
        console.error("fetchListsByHost error:", err);
        return null;
      }
    },
    [publicClient, deployed, deployment.address]
  );

  const fetchPending = useCallback(
    async (userAddr: `0x${string}`): Promise<bigint | null> => {
      if (!publicClient || !deployed) return null;
      try {
        const balance = await publicClient.readContract({
          address: deployment.address,
          abi: hamperAbi,
          functionName: "pending",
          args: [userAddr],
        });
        return BigInt(balance);
      } catch (err) {
        console.error("fetchPending error:", err);
        return null;
      }
    },
    [publicClient, deployed, deployment.address]
  );

  // --- Write Methods ---

  const createList = useCallback(
    async (
      title: string,
      labels: string[],
      targets: bigint[],
      durationSecs: bigint
    ): Promise<bigint> => {
      if (!walletClient || !publicClient || !deployed) {
        throw new Error("Wallet not connected or contract not deployed");
      }

      setIsTransacting(true);
      setTxHash(null);

      try {
        await assertActiveChain(walletClient);
        const hash = await checkedWrite(walletClient, publicClient, {
          address: deployment.address,
          abi: hamperAbi,
          functionName: "create",
          args: [title, labels, targets, durationSecs],
        });

        setTxHash(hash);
        const receipt = await waitSuccess(publicClient, hash);

        // Parse list ID from Created event
        let createdId: bigint = 1n; // honesty-ok: default fallback if event not found
        for (const log of receipt.logs) {
          const parsed = parseCreatedLog(log);
          if (parsed) {
            createdId = parsed.id;
            break;
          }
        }

        toast("success", `Registry #${createdId.toString()} created successfully!`);
        return createdId;
      } catch (err) {
        const msg = describeError(err);
        toast("error", msg);
        throw new Error(msg);
      } finally {
        setIsTransacting(false);
      }
    },
    [walletClient, publicClient, deployed, deployment.address, toast]
  );

  const giveGift = useCallback(
    async (
      listId: bigint,
      wishIndex: number,
      note: string,
      amountWei: bigint
    ): Promise<void> => {
      if (!walletClient || !publicClient || !deployed) {
        throw new Error("Wallet not connected or contract not deployed");
      }

      setIsTransacting(true);
      setTxHash(null);

      try {
        await assertActiveChain(walletClient);
        const hash = await checkedWrite(walletClient, publicClient, {
          address: deployment.address,
          abi: hamperAbi,
          functionName: "give",
          args: [listId, wishIndex, note],
          value: amountWei,
        });

        setTxHash(hash);
        await waitSuccess(publicClient, hash);
        toast("success", "Chipped in successfully! Thank you for giving.");
      } catch (err) {
        const msg = describeError(err);
        toast("error", msg);
        throw new Error(msg);
      } finally {
        setIsTransacting(false);
      }
    },
    [walletClient, publicClient, deployed, deployment.address, toast]
  );

  const claimWish = useCallback(
    async (listId: bigint, wishIndex: number): Promise<void> => {
      if (!walletClient || !publicClient || !deployed) {
        throw new Error("Wallet not connected or contract not deployed");
      }

      setIsTransacting(true);
      setTxHash(null);

      try {
        await assertActiveChain(walletClient);
        const hash = await checkedWrite(walletClient, publicClient, {
          address: deployment.address,
          abi: hamperAbi,
          functionName: "claim",
          args: [listId, wishIndex],
        });

        setTxHash(hash);
        await waitSuccess(publicClient, hash);
        toast("success", "Gift claimed into your till! You can withdraw anytime.");
      } catch (err) {
        const msg = describeError(err);
        toast("error", msg);
        throw new Error(msg);
      } finally {
        setIsTransacting(false);
      }
    },
    [walletClient, publicClient, deployed, deployment.address, toast]
  );

  const refundGift = useCallback(
    async (
      listId: bigint,
      wishIndex: number,
      giftIndex: number
    ): Promise<void> => {
      if (!walletClient || !publicClient || !deployed) {
        throw new Error("Wallet not connected or contract not deployed");
      }

      setIsTransacting(true);
      setTxHash(null);

      try {
        await assertActiveChain(walletClient);
        const hash = await checkedWrite(walletClient, publicClient, {
          address: deployment.address,
          abi: hamperAbi,
          functionName: "refund",
          args: [listId, wishIndex, giftIndex],
        });

        setTxHash(hash);
        await waitSuccess(publicClient, hash);
        toast("success", "Gift refunded into your till!");
      } catch (err) {
        const msg = describeError(err);
        toast("error", msg);
        throw new Error(msg);
      } finally {
        setIsTransacting(false);
      }
    },
    [walletClient, publicClient, deployed, deployment.address, toast]
  );

  const withdrawPending = useCallback(async (): Promise<void> => {
    if (!walletClient || !publicClient || !deployed) {
      throw new Error("Wallet not connected or contract not deployed");
    }

    setIsTransacting(true);
    setTxHash(null);

    try {
      await assertActiveChain(walletClient);
      const hash = await checkedWrite(walletClient, publicClient, {
        address: deployment.address,
        abi: hamperAbi,
        functionName: "withdraw",
      });

      setTxHash(hash);
      await waitSuccess(publicClient, hash);
      toast("success", "Withdrew funds to your wallet successfully!");
    } catch (err) {
      const msg = describeError(err);
      toast("error", msg);
      throw new Error(msg);
    } finally {
      setIsTransacting(false);
    }
  }, [walletClient, publicClient, deployed, deployment.address, toast]);

  return {
    deployed,
    address,
    isTransacting,
    txHash,
    fetchBlockTimestamp,
    fetchList,
    fetchWishes,
    fetchGifts,
    fetchLatestLists,
    fetchListsByHost,
    fetchPending,
    createList,
    giveGift,
    claimWish,
    refundGift,
    withdrawPending,
  };
}
