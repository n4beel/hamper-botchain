/**
 * Local stack runner and seeder for Hamper (Archetype AL · Registry shelf).
 *
 * Spawns anvil on port 8733 with chain id 968, deploys Hamper, and seeds state per spec §5:
 * - List 1: "Baby Registry" (Host: Alice, duration 30 days)
 *   - Wish 0: "High Chair" (0.2 BOT) -> fully funded by Bob & claimed by Alice
 *   - Wish 1: "Playmat" (0.1 BOT) -> partly funded by Charlie (0.06 BOT, 60%)
 *   - Wish 2: "Nursery Rocker" (0.5 BOT) -> empty (0%)
 * - List 2: "Birthday Fundraiser" (Host: Bob, duration 7 days) -> past deadline:
 *   - Wish 0: "Concert Ticket" (0.5 BOT) -> underfunded: Dave gave 0.2 BOT (refundable)
 *   - Wish 1: "Celebration Dinner" (0.2 BOT) -> underfunded: Charlie gave 0.05 BOT (refundable)
 * - List 3: "Housewarming Gifts" (Host: Charlie, duration 14 days):
 *   - Wish 0: "Blender" (0.15 BOT) -> fully funded by Dave (0.15 BOT), unclaimed
 * - List 4: "Team Leaving Gift" (Host: Eve, duration 60 days):
 *   - Wish 0: "Noise Cancelling Headphones" (0.3 BOT) -> empty
 *
 * Usage:
 *   node scripts/local-stack.mjs
 *   npm run dev
 */

import { spawn, execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const PORT = 8733;
const RPC = `http://127.0.0.1:${PORT}`;
const CHAIN_ID = 968;

const KEYS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // 0: Alice (List 1 Host)
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // 1: Bob (List 2 Host & Giver)
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // 2: Charlie (List 3 Host & Giver)
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // 3: Dave (Giver)
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", // 4: Eve (List 4 Host)
];

const accounts = KEYS.map((k) => privateKeyToAccount(k));

const local = defineChain({
  id: CHAIN_ID,
  name: "anvil",
  nativeCurrency: { name: "Test BOT", symbol: "tBOT", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

try {
  execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`);
} catch {}

console.log(`Starting anvil on port ${PORT}...`);
spawn(
  "anvil",
  [
    "--port",
    String(PORT),
    "--chain-id",
    String(CHAIN_ID),
    "--accounts",
    "10",
    "--balance",
    "1000",
    "--silent",
  ],
  { detached: true, stdio: "ignore" }
).unref();

const pub = createPublicClient({ chain: local, transport: http() });

for (let i = 0; i < 40; i++) {
  try {
    await pub.getBlockNumber();
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 100));
  }
}

const [alice, bob, charlie, dave, eve] = accounts.map((acc) =>
  createWalletClient({ account: acc, chain: local, transport: http() })
);

const artifact = JSON.parse(
  readFileSync("contracts/out/Hamper.sol/Hamper.json", "utf8")
);

console.log("Deploying Hamper contract...");
const deployTx = await alice.deployContract({
  abi: artifact.abi,
  bytecode: artifact.bytecode.object,
});
const deployReceipt = await pub.waitForTransactionReceipt({ hash: deployTx });
const contractAddress = deployReceipt.contractAddress;
const startBlock = deployReceipt.blockNumber;

console.log(`Deployed Hamper to ${contractAddress} at block ${startBlock}`);
console.log("Seeding gift lists, wishes, contributions, and claims...");

// 1. List 1: Alice's "Baby Registry" (30 days)
console.log("Creating List 1: Baby Registry (Alice)...");
const txL1 = await alice.writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "create",
  args: [
    "Baby Registry",
    ["High Chair", "Playmat", "Nursery Rocker"],
    [parseEther("0.2"), parseEther("0.1"), parseEther("0.5")],
    86400n * 30n,
  ],
});
await pub.waitForTransactionReceipt({ hash: txL1 });

// Bob fills Wish 0 (0.2 BOT)
console.log("Bob funds High Chair in full (0.2 BOT)...");
const txL1W0 = await bob.writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "give",
  args: [1n, 0, "So excited for the new baby! Lots of love."],
  value: parseEther("0.2"),
});
await pub.waitForTransactionReceipt({ hash: txL1W0 });

// Alice claims Wish 0
console.log("Alice claims High Chair (0.2 BOT)...");
const txClaimL1W0 = await alice.writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "claim",
  args: [1n, 0],
});
await pub.waitForTransactionReceipt({ hash: txClaimL1W0 });

// Charlie chips in 0.06 BOT to Wish 1 (60%)
console.log("Charlie chips in 0.06 BOT to Playmat...");
const txL1W1 = await charlie.writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "give",
  args: [1n, 1, "Hope baby enjoys playtime!"],
  value: parseEther("0.06"),
});
await pub.waitForTransactionReceipt({ hash: txL1W1 });

// 2. List 2: Bob's "Birthday Fundraiser" (7 days) -> will become past deadline
console.log("Creating List 2: Birthday Fundraiser (Bob)...");
const txL2 = await bob.writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "create",
  args: [
    "Birthday Fundraiser",
    ["Concert Ticket", "Celebration Dinner"],
    [parseEther("0.5"), parseEther("0.2")],
    86400n * 7n,
  ],
});
await pub.waitForTransactionReceipt({ hash: txL2 });

// Dave chips in 0.2 BOT to Concert Ticket
console.log("Dave chips in 0.2 BOT to Concert Ticket...");
const txL2W0 = await dave.writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "give",
  args: [2n, 0, "Have a blast at the show! Happy Birthday!"],
  value: parseEther("0.2"),
});
await pub.waitForTransactionReceipt({ hash: txL2W0 });

// Charlie chips in 0.05 BOT to Celebration Dinner
console.log("Charlie chips in 0.05 BOT to Celebration Dinner...");
const txL2W1 = await charlie.writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "give",
  args: [2n, 1, "Drinks are on us!"],
  value: parseEther("0.05"),
});
await pub.waitForTransactionReceipt({ hash: txL2W1 });

// Advance time 8 days so List 2 passes deadline
console.log("Advancing time 8 days past List 2 deadline...");
await pub.request({ method: "evm_increaseTime", params: [86400 * 8] });
await pub.request({ method: "evm_mine", params: [] });

// 3. List 3: Charlie's "Housewarming Gifts" (14 days)
console.log("Creating List 3: Housewarming Gifts (Charlie)...");
const txL3 = await charlie.writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "create",
  args: [
    "Housewarming Gifts",
    ["Blender", "Coffee Table", "Floor Lamp"],
    [parseEther("0.15"), parseEther("0.3"), parseEther("0.1")],
    86400n * 14n,
  ],
});
await pub.waitForTransactionReceipt({ hash: txL3 });

// Dave fills Wish 0 (Blender, 0.15 BOT) in full
console.log("Dave fully funds Blender (0.15 BOT)...");
const txL3W0 = await dave.writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "give",
  args: [3n, 0, "Welcome to the new apartment!"],
  value: parseEther("0.15"),
});
await pub.waitForTransactionReceipt({ hash: txL3W0 });

// 4. List 4: Eve's "Team Leaving Gift" (60 days) - empty
console.log("Creating List 4: Team Leaving Gift (Eve)...");
const txL4 = await eve.writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "create",
  args: [
    "Team Leaving Gift",
    ["Noise Cancelling Headphones"],
    [parseEther("0.3")],
    86400n * 60n,
  ],
});
await pub.waitForTransactionReceipt({ hash: txL4 });

console.log("\nRoles Table:");
console.log("------------------------------------------------------------------------------------------------");
console.log("| Role                 | Index | Address                                    | Private Key (first 10) |");
console.log("------------------------------------------------------------------------------------------------");
console.log(`| Host 1 (Alice)       | 0     | ${accounts[0].address} | ${KEYS[0].slice(0, 10)}... |`);
console.log(`| Host 2 / Giver (Bob) | 1     | ${accounts[1].address} | ${KEYS[1].slice(0, 10)}... |`);
console.log(`| Host 3 (Charlie)     | 2     | ${accounts[2].address} | ${KEYS[2].slice(0, 10)}... |`);
console.log(`| Giver C (Dave)       | 3     | ${accounts[3].address} | ${KEYS[3].slice(0, 10)}... |`);
console.log(`| Host 4 (Eve)         | 4     | ${accounts[4].address} | ${KEYS[4].slice(0, 10)}... |`);
console.log("------------------------------------------------------------------------------------------------\n");

console.log("Seeded Status Table:");
console.log("------------------------------------------------------------------------------------------------");
console.log("| List ID | Title                | Wish Index | Target    | Raised    | State      | Host Action / Notes |");
console.log("------------------------------------------------------------------------------------------------");
console.log("| 1       | Baby Registry        | 0: High Chair| 0.20 BOT| 0.20 BOT  | Claimed    | Alice claimed to till |");
console.log("| 1       | Baby Registry        | 1: Playmat   | 0.10 BOT| 0.06 BOT  | 60% funded | Charlie gave 0.06 BOT |");
console.log("| 1       | Baby Registry        | 2: Rocker    | 0.50 BOT| 0.00 BOT  | Empty      | Open for gift         |");
console.log("| 2       | Birthday Fundraiser  | 0: Concert   | 0.50 BOT| 0.20 BOT  | Underfunded| Expired, Dave refund  |");
console.log("| 2       | Birthday Fundraiser  | 1: Dinner    | 0.20 BOT| 0.05 BOT  | Underfunded| Expired, Charlie ref  |");
console.log("| 3       | Housewarming Gifts   | 0: Blender   | 0.15 BOT| 0.15 BOT  | Full       | Charlie can claim     |");
console.log("| 4       | Team Leaving Gift    | 0: Headset   | 0.30 BOT| 0.00 BOT  | New/Empty  | 0 gifts               |");
console.log("------------------------------------------------------------------------------------------------\n");

// Write .env.local
const envContent = [
  `NEXT_PUBLIC_BOTCHAIN_NETWORK=testnet`,
  `NEXT_PUBLIC_BOHR_RPC=${RPC}`,
  `NEXT_PUBLIC_CONTRACT_968=${contractAddress}`,
  `NEXT_PUBLIC_DEPLOY_BLOCK_968=${startBlock}`,
  "",
].join("\n");

writeFileSync(".env.local", envContent);
console.log("Wrote .env.local");
console.log(`\nLocal stack ready on port ${PORT}!`);
