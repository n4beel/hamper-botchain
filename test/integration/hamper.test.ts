import { spawn, execSync, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseEther,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hamperAbi } from "@/lib/botchain/abi";

const PORT = 8633;
const RPC = `http://127.0.0.1:${PORT}`;
const CHAIN_ID = 968;

const localChain = defineChain({
  id: CHAIN_ID,
  name: "anvil",
  nativeCurrency: { name: "Test BOT", symbol: "tBOT", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

const ACCOUNTS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // 0: Host (Alice)
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // 1: Giver A (Bob)
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // 2: Giver B (Charlie)
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // 3: Giver C (Dave)
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", // 4: Host 2 (Eve)
].map((k) => privateKeyToAccount(k as `0x${string}`));

describe("Hamper On-Chain Integration Tests", () => {
  let anvil: ChildProcess;
  let contractAddress: Address;

  const publicClient = createPublicClient({
    chain: localChain,
    transport: http(RPC),
  });

  const [alice, bob, charlie, dave, eve] = ACCOUNTS.map((account) =>
    createWalletClient({
      account,
      chain: localChain,
      transport: http(RPC),
    })
  );

  async function advanceTime(seconds: number) {
    await publicClient.request({
      method: "evm_increaseTime" as any,
      params: [seconds] as any,
    });
    await publicClient.request({
      method: "evm_mine" as any,
      params: [] as any,
    });
  }

  beforeAll(async () => {
    try {
      execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`);
    } catch {}

    anvil = spawn("anvil", [
      "--port",
      String(PORT),
      "--chain-id",
      String(CHAIN_ID),
      "--silent",
    ]);

    for (let i = 0; i < 30; i++) {
      try {
        await publicClient.getBlockNumber();
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    const artifactPath = join(
      process.cwd(),
      "contracts",
      "out",
      "Hamper.sol",
      "Hamper.json"
    );
    const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));

    const deployHash = await alice.deployContract({
      abi: artifact.abi,
      bytecode: artifact.bytecode.object as `0x${string}`,
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: deployHash,
    });
    contractAddress = receipt.contractAddress!;
  });

  afterAll(() => {
    if (anvil) {
      anvil.kill("SIGTERM");
    }
  });

  it("Alice creates a 3-wish list", async () => {
    const hash = await alice.writeContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "create",
      args: [
        "Wedding Registry",
        ["Coffee Machine", "Baby Stroller", "Nursery Rocker"],
        [parseEther("0.2"), parseEther("0.5"), parseEther("1.0")],
        86400n * 14n,
      ],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe("success");

    const count = await publicClient.readContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "listCount",
    });
    expect(count).toBe(1n);

    const lst = await publicClient.readContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "listOf",
      args: [1n],
    });
    expect(lst.title).toBe("Wedding Registry");
    expect(lst.wishCount).toBe(3);
    expect(lst.host.toLowerCase()).toBe(alice.account.address.toLowerCase());
  });

  it("Bob contributes 0.2 BOT to fully fund Wish 0", async () => {
    const hash = await bob.writeContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "give",
      args: [1n, 0, "All the best for the coffee machine!"],
      value: parseEther("0.2"),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe("success");

    const w = await publicClient.readContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "wishOf",
      args: [1n, 0],
    });
    expect(w.raised).toBe(parseEther("0.2"));
    expect(w.target).toBe(parseEther("0.2"));
    expect(w.claimed).toBe(false);

    const r = await publicClient.readContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "room",
      args: [1n, 0],
    });
    expect(r).toBe(0n);
  });

  it("Charlie chips in 0.25 BOT to Wish 1 (50% funded)", async () => {
    const hash = await charlie.writeContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "give",
      args: [1n, 1, "Halfway for the stroller!"],
      value: parseEther("0.25"),
    });

    await publicClient.waitForTransactionReceipt({ hash });

    const w = await publicClient.readContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "wishOf",
      args: [1n, 1],
    });
    expect(w.raised).toBe(parseEther("0.25"));
    expect(w.target).toBe(parseEther("0.5"));

    const r = await publicClient.readContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "room",
      args: [1n, 1],
    });
    expect(r).toBe(parseEther("0.25"));
  });

  it("Dave cannot overfund Wish 1, then exactly fills remaining 0.25 BOT", async () => {
    // Overfund attempt: trying to send 0.3 BOT when room is 0.25 BOT
    await expect(
      publicClient.simulateContract({
        address: contractAddress,
        abi: hamperAbi,
        functionName: "give",
        args: [1n, 1, "Too much"],
        value: parseEther("0.3"),
        account: dave.account,
      })
    ).rejects.toThrow();

    // Exact fill: send 0.25 BOT
    const hash = await dave.writeContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "give",
      args: [1n, 1, "Closing the stroller!"],
      value: parseEther("0.25"),
    });

    await publicClient.waitForTransactionReceipt({ hash });

    const w = await publicClient.readContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "wishOf",
      args: [1n, 1],
    });
    expect(w.raised).toBe(parseEther("0.5"));
    expect(w.target).toBe(parseEther("0.5"));
  });

  it("Alice claims Wish 0 and Wish 1, then withdraws 0.7 BOT", async () => {
    // Non-host cannot claim
    await expect(
      publicClient.simulateContract({
        address: contractAddress,
        abi: hamperAbi,
        functionName: "claim",
        args: [1n, 0],
        account: bob.account,
      })
    ).rejects.toThrow();

    // Alice claims wish 0
    let hash = await alice.writeContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "claim",
      args: [1n, 0],
    });
    await publicClient.waitForTransactionReceipt({ hash });

    // Alice claims wish 1
    hash = await alice.writeContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "claim",
      args: [1n, 1],
    });
    await publicClient.waitForTransactionReceipt({ hash });

    const pendingAlice = await publicClient.readContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "pending",
      args: [alice.account.address],
    });
    expect(pendingAlice).toBe(parseEther("0.7"));

    // Alice withdraws
    hash = await alice.writeContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "withdraw",
      args: [],
    });
    await publicClient.waitForTransactionReceipt({ hash });

    const postWithdrawPending = await publicClient.readContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "pending",
      args: [alice.account.address],
    });
    expect(postWithdrawPending).toBe(0n);
  });

  it("Refund flow: underfunded wish past deadline is refunded to giver", async () => {
    // Eve creates list with 1-day deadline
    const hashCreate = await eve.writeContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "create",
      args: ["Short List", ["Tea Set"], [parseEther("1.0")], 86400n],
    });
    const receiptCreate = await publicClient.waitForTransactionReceipt({
      hash: hashCreate,
    });
    expect(receiptCreate.status).toBe("success");

    // Bob gives 0.3 BOT
    const hashGive = await bob.writeContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "give",
      args: [2n, 0, "Partial gift"],
      value: parseEther("0.3"),
    });
    await publicClient.waitForTransactionReceipt({ hash: hashGive });

    // Try refund before deadline -> reverts
    await expect(
      publicClient.simulateContract({
        address: contractAddress,
        abi: hamperAbi,
        functionName: "refund",
        args: [2n, 0, 0],
        account: bob.account,
      })
    ).rejects.toThrow();

    // Advance time 2 days
    await advanceTime(86400 * 2);

    // Anyone triggers refund for Bob's gift
    const hashRefund = await charlie.writeContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "refund",
      args: [2n, 0, 0],
    });
    await publicClient.waitForTransactionReceipt({ hash: hashRefund });

    const pendingBob = await publicClient.readContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "pending",
      args: [bob.account.address],
    });
    expect(pendingBob).toBe(parseEther("0.3"));

    // Bob withdraws refund
    const hashWithdraw = await bob.writeContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "withdraw",
      args: [],
    });
    await publicClient.waitForTransactionReceipt({ hash: hashWithdraw });

    const finalPendingBob = await publicClient.readContract({
      address: contractAddress,
      abi: hamperAbi,
      functionName: "pending",
      args: [bob.account.address],
    });
    expect(finalPendingBob).toBe(0n);
  });
});
