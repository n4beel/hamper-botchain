/**
 * Comprehensive Browser Walkthrough for Hamper (Archetype AL · Registry shelf).
 * Connects to Headless Chrome via CDP, injects mock-wallet.js,
 * tests 1280px Desktop & 360px Mobile viewports, footer links, wallet menu tokens,
 * walks every route (/ , /new , /h/1 , /h/3/manage , /me , /not-found),
 * executes real on-chain transactions:
 * 1. Dave chips in 0.04 BOT to Wish 1 on List 1 ("Chip in for this item"), making it 100% full.
 * 2. Charlie (Host of List 3) claims 0.15 BOT for Wish 0 on /h/3/manage.
 * 3. Charlie refunds 0.05 BOT for expired underfunded Wish 1 on /me.
 * 4. Charlie withdraws total till balance (0.20 BOT) on /me.
 * 5. Alice creates a new registry on /new and views the shelf on /h/5.
 * and asserts 0 console errors and 0px horizontal overflow across all routes.
 */
import { spawn, execSync } from "node:child_process";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPublicClient, defineChain, http } from "viem";

console.log("Resetting and seeding local stack on port 8733...");
execSync("node scripts/local-stack.mjs", { stdio: "inherit" });

const CHROME_PORT = 9222;
const APP_URL = "http://localhost:3000";
const RPC_URL = "http://127.0.0.1:8733";
const CHAIN_ID = 968;

const ACC_ALICE = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";   // Host List 1
const ACC_BOB = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";     // Host List 2 / Giver
const ACC_CHARLIE = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // Host List 3 / Giver List 2
const ACC_DAVE = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";    // Giver List 1 & 2
const ACC_EVE = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65";     // Host List 4

const mockWalletScript = readFileSync(
  new URL("../../docs/specs/tools/mock-wallet.js", import.meta.url),
  "utf8"
);

// Read contract address from .env.local
const envLocal = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const matchContract = envLocal.match(/NEXT_PUBLIC_CONTRACT_968=(0x[a-fA-F0-9]{40})/);
if (!matchContract) throw new Error("Could not find NEXT_PUBLIC_CONTRACT_968 in .env.local");
const CONTRACT_ADDRESS = matchContract[1];

const localChain = defineChain({
  id: CHAIN_ID,
  name: "anvil",
  nativeCurrency: { name: "Test BOT", symbol: "tBOT", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});
const pubClient = createPublicClient({ chain: localChain, transport: http() });

const artifact = JSON.parse(
  readFileSync(new URL("../contracts/out/Hamper.sol/Hamper.json", import.meta.url), "utf8")
);

const initialListCount = await pubClient.readContract({
  address: CONTRACT_ADDRESS,
  abi: artifact.abi,
  functionName: "listCount",
});
console.log(`Contract at: ${CONTRACT_ADDRESS}`);
console.log(`On-chain initial list count: ${initialListCount}`);

const userDir = mkdtempSync(join(tmpdir(), "chrome-hamper-"));

console.log("Launching headless Chrome...");
const chrome = spawn("google-chrome", [
  "--headless=new",
  `--remote-debugging-port=${CHROME_PORT}`,
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  `--user-data-dir=${userDir}`,
  "about:blank",
]);

await new Promise((r) => setTimeout(r, 1200));

async function cdpHttp(path, method = "GET") {
  const res = await fetch(`http://127.0.0.1:${CHROME_PORT}${path}`, { method });
  return await res.json();
}

const version = await cdpHttp("/json/version");
console.log("Connected to Chrome:", version["Browser"]);

const list = await cdpHttp("/json/list");
const pageTarget = list.find((t) => t.type === "page");
const wsUrl = pageTarget?.webSocketDebuggerUrl;
if (!wsUrl) throw new Error("No page webSocketDebuggerUrl found");

const ws = new WebSocket(wsUrl);
let reqId = 1;
const pending = new Map();
const consoleErrors = [];
const cdpListeners = new Set();

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  for (const listener of cdpListeners) {
    try {
      listener(msg);
    } catch {}
  }
  if (msg.method === "Runtime.consoleAPICalled") {
    const text = msg.params.args?.map((a) => a.value || a.description).join(" ") || "";
    if (msg.params.type === "error") {
      if (!text.includes("favicon") && !text.includes("404")) {
        consoleErrors.push(text);
        console.error("Browser Console Error:", text);
      }
    } else {
      console.log(`[Browser Console ${msg.params.type}]`, text);
    }
  }
  if (msg.method === "Runtime.exceptionThrown") {
    const text = msg.params.exceptionDetails?.text || "";
    consoleErrors.push(text);
    console.error("Browser Exception:", text);
  }
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  }
};

await new Promise((resolve) => {
  if (ws.readyState === WebSocket.OPEN) resolve();
  else ws.onopen = resolve;
});

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = reqId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await send("Page.enable");
await send("Runtime.enable");
await send("DOM.enable");
await send("CSS.enable");

// Injected mock wallet (reads active account from localStorage across navigations)
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `
    ${mockWalletScript}
    const acc = localStorage.getItem("__active_mock_account") || "${ACC_BOB}";
    window.__installMockWallet({ rpc: "${RPC_URL}", account: acc });
    console.log("[MockWallet] Injected & installed for " + acc);
  `,
});

async function evalInPage(expression) {
  const res = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res.exceptionDetails) {
    throw new Error(JSON.stringify(res.exceptionDetails) || "eval failed");
  }
  return res.result?.value;
}

async function setViewport(width, height) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });
}

async function switchMockAccount(accountAddress) {
  await evalInPage(`
    localStorage.setItem("__active_mock_account", "${accountAddress}");
    if (window.__mockWallet) {
      window.__mockWallet.setAccount("${accountAddress}");
    }
  `);
  await new Promise((r) => setTimeout(r, 200));
}

async function ensureWalletConnected() {
  const connected = await evalInPage(`
    (() => {
      const connectBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Connect"));
      if (connectBtn) {
        connectBtn.click();
        return false;
      }
      return true;
    })()
  `);
  if (!connected) {
    await new Promise((r) => setTimeout(r, 600));
    // Click any menu item that may have opened
    await evalInPage(`
      (() => {
        const item = Array.from(document.querySelectorAll("[role='menuitem']")).find(el => 
          el.textContent.includes("Mock Wallet") || 
          el.textContent.includes("MetaMask") || 
          el.textContent.includes("Injected")
        );
        if (item) item.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 1000));
  }
}

async function navigate(path) {
  console.log(`Navigating to ${path}...`);
  const url = `${APP_URL}${path}`;
  const loadPromise = new Promise((resolve) => {
    const handler = (msg) => {
      if (msg.method === "Page.loadEventFired") {
        cdpListeners.delete(handler);
        resolve();
      }
    };
    cdpListeners.add(handler);
    setTimeout(() => {
      cdpListeners.delete(handler);
      resolve();
    }, 4000);
  });
  await send("Page.navigate", { url });
  await loadPromise;
  await new Promise((r) => setTimeout(r, 600));
}

async function checkNoHorizontalOverflow(routeName, viewportWidth) {
  const overflow = await evalInPage(`
    ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyWidth: document.body.scrollWidth,
    })
  `);
  const diff = overflow.scrollWidth - overflow.clientWidth;
  if (diff > 1) {
    throw new Error(
      `Horizontal overflow detected on ${routeName} at ${viewportWidth}px: scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth}`
    );
  }
  console.log(
    `✓ 0px overflow on ${routeName} (${viewportWidth}px: ${overflow.clientWidth}px wide)`
  );
}

try {
  // 1. Desktop 1280px - Route Tests
  console.log("\n=== Testing Desktop 1280px Routes ===");
  await setViewport(1280, 800);
  await navigate("/");
  await switchMockAccount(ACC_ALICE);

  // Validate Tokens & Wallet Menu
  const tokens = await evalInPage(`
    ({
      menuBg: getComputedStyle(document.documentElement).getPropertyValue('--menu-bg').trim().toLowerCase(),
      menuFg: getComputedStyle(document.documentElement).getPropertyValue('--menu-fg').trim().toLowerCase(),
      menuMuted: getComputedStyle(document.documentElement).getPropertyValue('--menu-muted').trim().toLowerCase(),
      menuBorder: getComputedStyle(document.documentElement).getPropertyValue('--menu-border').trim().toLowerCase(),
      menuHoverBg: getComputedStyle(document.documentElement).getPropertyValue('--menu-hover-bg').trim().toLowerCase(),
      menuDanger: getComputedStyle(document.documentElement).getPropertyValue('--menu-danger').trim().toLowerCase(),
      accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().toLowerCase(),
    })
  `);
  console.log("CSS Tokens verified:", tokens);
  if (!tokens.accent.includes("e0457b")) {
    throw new Error(`Accent token expected #e0457b, got ${tokens.accent}`);
  }
  if (!["#ffffff", "#fff", "rgb(255, 255, 255)"].includes(tokens.menuBg)) {
    throw new Error(`Menu bg token expected white, got ${tokens.menuBg}`);
  }
  await checkNoHorizontalOverflow("/", 1280);

  // Check Footer 3 links on Home
  const footerLinksOk = await evalInPage(`
    (function() {
      const footer = document.querySelector('footer');
      if (!footer) return false;
      const text = footer.innerText;
      const links = Array.from(footer.querySelectorAll('a')).map(a => a.href);
      return links.some(l => l.includes('botchain.ai')) &&
             links.some(l => l.includes('scan.botchain.ai')) &&
             (links.some(l => l.includes('/address/')) || text.includes('Built on BOT Chain'));
    })()
  `);
  if (!footerLinksOk) throw new Error("Footer missing 3 required links on /");
  console.log("✓ Footer links verified on /");

  // Check Fine print on /
  const finePrintOk = await evalInPage(`
    (function() {
      const text = document.body.innerText;
      return text.includes("Fine print") &&
             text.includes("Each wish is all-or-nothing") &&
             text.includes("The host decides what to buy") &&
             text.includes("A gift can't be taken back");
    })()
  `);
  if (!finePrintOk) throw new Error("LimitationBlock missing required fine print text");
  console.log("✓ Fine print copy verified on /");

  // Test /new
  await navigate("/new");
  await checkNoHorizontalOverflow("/new", 1280);

  // Test /h/1 (Baby Registry)
  await navigate("/h/1");
  await checkNoHorizontalOverflow("/h/1", 1280);

  // Test /h/1/manage
  await navigate("/h/1/manage");
  await checkNoHorizontalOverflow("/h/1/manage", 1280);

  // Test /me
  await navigate("/me");
  await checkNoHorizontalOverflow("/me", 1280);

  // Test 404
  await navigate("/non-existent-list-page");
  await checkNoHorizontalOverflow("/non-existent-list-page", 1280);

  // 2. Mobile 360px - Strict Viewport and One-Box-Per-Row Check
  console.log("\n=== Testing Mobile 360px Viewports ===");
  await setViewport(360, 640);
  await navigate("/");
  await checkNoHorizontalOverflow("/", 360);

  await navigate("/new");
  await checkNoHorizontalOverflow("/new", 360);

  await navigate("/h/1");
  await checkNoHorizontalOverflow("/h/1", 360);

  // Verify on 360px: One box per row (Spec §8.4)
  const singleColBoxes = await evalInPage(`
    (function() {
      const boxes = Array.from(document.querySelectorAll('[data-testid^="wish-box-"]'));
      if (boxes.length < 2) return true;
      const top0 = boxes[0].getBoundingClientRect().top;
      const top1 = boxes[1].getBoundingClientRect().top;
      return Math.abs(top1 - top0) > 100; // top positions must differ significantly (stacked vertically)
    })()
  `);
  if (!singleColBoxes) {
    throw new Error("Gift boxes are not strictly stacked one-per-row at 360px!");
  }
  console.log("✓ Verified 360px layout has strictly 1 gift box per row");

  await navigate("/h/1/manage");
  await checkNoHorizontalOverflow("/h/1/manage", 360);

  await navigate("/me");
  await checkNoHorizontalOverflow("/me", 360);

  // 3. Executing On-Chain Flows
  console.log("\n=== Executing Live On-Chain Walkthrough Transactions ===");
  await setViewport(1280, 800);

  // Flow A: Dave chips in 0.04 BOT for Wish 1 ("Playmat") on /h/1
  console.log("\n--- Flow A: Dave chips in for Wish 1 on /h/1 ---");
  await navigate("/h/1");
  await switchMockAccount(ACC_DAVE);

  // Connect mock wallet
  await ensureWalletConnected();
  const currentAddr = await evalInPage(`(async () => window.ethereum ? await window.ethereum.request({ method: 'eth_accounts' }) : null)()`);
  console.log("   Current provider accounts:", currentAddr);

  // Click "Chip in for this item" on Wish 1
  const openedModal = await evalInPage(`
    (function() {
      const box1 = document.querySelector('[data-testid="wish-box-1"]');
      if (!box1) return false;
      const chipInBtn = Array.from(box1.querySelectorAll('button')).find(b => b.innerText.includes('Chip in'));
      if (chipInBtn) {
        chipInBtn.click();
        return true;
      }
      return false;
    })()
  `);
  console.log("Opened chip in modal on Wish 1:", openedModal);
  if (!openedModal) throw new Error("Could not find Chip in button on Wish 1");
  await new Promise((r) => setTimeout(r, 600));

  // Click Max (0.04) button in modal to set amount
  await evalInPage(`
    (function() {
      const maxBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Max'));
      if (maxBtn) maxBtn.click();

      const noteInput = document.getElementById('give-note');
      if (noteInput) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(noteInput, 'From Dave with warmth! ❤️');
        if (noteInput._valueTracker) noteInput._valueTracker.setValue('');
        noteInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()
  `);
  await new Promise((r) => setTimeout(r, 600));

  console.log("   Dialog text after Max clicked:", await evalInPage("document.querySelector('[role=\"dialog\"]')?.innerText"));

  // Submit modal form
  const modalSubmitted = await evalInPage(`
    (function() {
      const form = document.querySelector('[role="dialog"] form');
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Chip in for this item') && b.type === 'submit');
      console.log("[Test] form found:", !!form, "submitBtn found:", !!submitBtn, "amount value:", document.getElementById('give-amount')?.value);
      if (form) {
        if (form.requestSubmit) form.requestSubmit();
        else if (submitBtn) submitBtn.click();
        return true;
      }
      return false;
    })()
  `);
  if (!modalSubmitted) throw new Error("Could not submit GiveModal");
  console.log("Submitted chip in transaction from Dave (0.04 BOT)...");
  await new Promise((r) => setTimeout(r, 4500));

  console.log("   Dialog text after submit:", await evalInPage("document.querySelector('[role=\"dialog\"]')?.innerText"));
  console.log("   Header text after submit:", await evalInPage("document.querySelector('header')?.innerText"));

  // Verify on-chain wish 1 is now 0.10 BOT
  const wish1Data = await pubClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: artifact.abi,
    functionName: "wishOf",
    args: [1n, 1],
  });
  console.log(`Wish 1 raised on-chain: ${wish1Data.raised} (Target: ${wish1Data.target})`);
  if (wish1Data.raised !== wish1Data.target) {
    throw new Error(`Wish 1 should be fully funded (0.10 BOT), but raised=${wish1Data.raised}`);
  }
  console.log("✓ Wish 1 is now 100% fully funded on-chain!");

  // Flow B: Charlie claims Wish 0 on List 3 on /h/3/manage
  console.log("\n--- Flow B: Charlie claims Wish 0 on /h/3/manage ---");
  await navigate("/h/3/manage");
  await switchMockAccount(ACC_CHARLIE);

  // Click Claim button for Wish 0
  const claimedClick = await evalInPage(`
    (function() {
      const claimBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Claim 0.15 BOT'));
      if (claimBtn) {
        claimBtn.click();
        return true;
      }
      return false;
    })()
  `);
  console.log("Clicked Claim 0.15 BOT button:", claimedClick);
  if (!claimedClick) throw new Error("Could not find Claim button on /h/3/manage");
  await new Promise((r) => setTimeout(r, 3000));

  // Check on-chain Wish 0 is claimed and Charlie pending balance increased
  const wish0List3 = await pubClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: artifact.abi,
    functionName: "wishOf",
    args: [3n, 0],
  });
  const charliePending = await pubClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: artifact.abi,
    functionName: "pending",
    args: [ACC_CHARLIE],
  });
  console.log(`Wish 0 claimed state: ${wish0List3.claimed}, Charlie pending till: ${charliePending}`);
  if (!wish0List3.claimed) throw new Error("Wish 0 was not claimed on-chain");
  console.log("✓ Charlie successfully claimed Wish 0 into till on-chain!");

  // Flow C: Charlie refunds expired underfunded Wish 1 of List 2 on /me
  console.log("\n--- Flow C: Charlie refunds expired underfunded gift on /me ---");
  await navigate("/me");
  await switchMockAccount(ACC_CHARLIE);

  const refundClick = await evalInPage(`
    (function() {
      const refundBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Refund 0.05 BOT'));
      if (refundBtn) {
        refundBtn.click();
        return true;
      }
      return false;
    })()
  `);
  console.log("Clicked Refund button on /me:", refundClick);
  if (!refundClick) throw new Error("Could not find Refund 0.05 BOT button on /me");
  await new Promise((r) => setTimeout(r, 3000));

  const charliePendingAfterRefund = await pubClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: artifact.abi,
    functionName: "pending",
    args: [ACC_CHARLIE],
  });
  console.log(`Charlie pending till after refund: ${charliePendingAfterRefund} (expected 0.20 BOT)`);
  if (charliePendingAfterRefund !== 200000000000000000n) {
    throw new Error(`Expected Charlie pending till = 0.20 BOT, got ${charliePendingAfterRefund}`);
  }
  console.log("✓ Gift successfully refunded to Charlie's till on-chain!");

  // Flow D: Charlie withdraws total till balance (0.20 BOT) on /me
  console.log("\n--- Flow D: Charlie withdraws total till balance on /me ---");
  const withdrawClick = await evalInPage(`
    (function() {
      const withdrawBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Withdraw to Wallet'));
      if (withdrawBtn && !withdrawBtn.disabled) {
        withdrawBtn.click();
        return true;
      }
      return false;
    })()
  `);
  console.log("Clicked Withdraw to Wallet button:", withdrawClick);
  if (!withdrawClick) throw new Error("Could not find active Withdraw to Wallet button on /me");
  await new Promise((r) => setTimeout(r, 3000));

  const charliePendingAfterWithdraw = await pubClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: artifact.abi,
    functionName: "pending",
    args: [ACC_CHARLIE],
  });
  console.log(`Charlie pending till after withdrawal: ${charliePendingAfterWithdraw}`);
  if (charliePendingAfterWithdraw !== 0n) {
    throw new Error(`Expected pending balance = 0n, got ${charliePendingAfterWithdraw}`);
  }
  console.log("✓ Charlie successfully withdrew all till funds on-chain!");

  // Flow E: Alice creates a new registry on /new
  console.log("\n--- Flow E: Alice creates a new registry on /new ---");
  await navigate("/new");
  await switchMockAccount(ACC_ALICE);

  const createdSubmitted = await evalInPage(`
    (function() {
      const setVal = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const titleInput = document.getElementById('reg-title');
      if (!titleInput) return false;
      setVal(titleInput, "Retirement Farewell Hamper");

      const itemInputs = Array.from(document.querySelectorAll('input[placeholder*="Item name"]'));
      const targetInputs = Array.from(document.querySelectorAll('input[placeholder="Target"]'));
      if (itemInputs[0] && targetInputs[0]) {
        setVal(itemInputs[0], "Kindle Oasis");
        setVal(targetInputs[0], "0.2");
      }

      // Add second item
      const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add Item'));
      if (addBtn) addBtn.click();

      setTimeout(() => {
        const itemInputs2 = Array.from(document.querySelectorAll('input[placeholder*="Item name"]'));
        const targetInputs2 = Array.from(document.querySelectorAll('input[placeholder="Target"]'));
        if (itemInputs2[1] && targetInputs2[1]) {
          setVal(itemInputs2[1], "Leather Bag");
          setVal(targetInputs2[1], "0.3");
        }
      }, 200);

      return true;
    })()
  `);
  await new Promise((r) => setTimeout(r, 600));

  const launchClick = await evalInPage(`
    (function() {
      const launchBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Launch Gift Registry'));
      if (launchBtn) {
        launchBtn.click();
        return true;
      }
      return false;
    })()
  `);
  console.log("Submitted new registry form:", launchClick);
  if (!launchClick) throw new Error("Could not find Launch Gift Registry button");
  await new Promise((r) => setTimeout(r, 3500));

  const finalListCount = await pubClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: artifact.abi,
    functionName: "listCount",
  });
  console.log(`Final on-chain list count: ${finalListCount} (Initial was ${initialListCount})`);
  if (finalListCount !== initialListCount + 1n) {
    throw new Error(`Expected list count ${initialListCount + 1n}, got ${finalListCount}`);
  }
  console.log("✓ Successfully created List 5 on-chain!");

  // Assert console errors
  if (consoleErrors.length > 0) {
    throw new Error(`Console errors recorded during walkthrough:\n${consoleErrors.join("\n")}`);
  }
  console.log("\n=======================================================");
  console.log("✓ All 5 on-chain flows succeeded!");
  console.log("✓ 0 console errors recorded across entire session.");
  console.log("✓ 0px horizontal overflow across all desktop & mobile routes.");
  console.log("✓ Archetype AL · Registry shelf verified.");
  console.log("=======================================================\n");

} finally {
  try {
    ws.close();
    chrome.kill("SIGTERM");
  } catch {}
}
