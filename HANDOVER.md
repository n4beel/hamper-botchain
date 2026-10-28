# Hamper Handover Report

## 1. What Was Built
Hamper is an all-or-nothing multi-item gift registry in native BOT built for the BOT Chain ecosystem (Bohr testnet, chain ID 968) under **Archetype AL · Registry shelf**.

Key components:
- **Smart Contract (`contracts/src/Hamper.sol`)**:
  - `create(title, labels, targets, durationSecs)`: Registers a gift list with 1..10 wishes, discrete positive targets, bounded titles/labels, and 1..365 day deadline. Emits `Created`.
  - `give(id, wish, note)` payable: Friends chip in toward specific wishes with a note up to 64 chars. Blocks overfunding (`Overfunds(room)`), enforces list deadline (`Closed`), blocks host self-giving (`HostCannotGive`), and requires positive value. Emits `Gave`.
  - `claim(id, wish)`: Host-only fulfillment claim once `raised == target`. Credits `pending[host] += raised`. Emits `Claimed`.
  - `refund(id, wish, giftIndex)`: Permissionless refund for an underfunded wish past the deadline (`now >= deadline && !claimed && raised < target`). Credits `pending[giver] += amount`. Emits `Refunded`.
  - `withdraw()`: Non-reentrant pull payment withdrawal for all host claims and giver refunds.
  - Views: `listOf(id)`, `wishesOf(id)`, `wishOf(id, wish)`, `giftsOf(id, wish, offset, count)` (≤ 50), `room(id, wish)`, `latest(offset, count)` (≤ 50), `byHost(addr)`, `pending(addr)`, `listCount()`.
- **Frontend Architecture (Archetype AL · Registry shelf)**:
  - Palette: Ground `#FFFFFF`, Surface `#FFF4F8`, Text `#3A1D28`, Muted `#6E4655`, Accent Raspberry `#E0457B` (`#FFFFFF` ink), Borders `#EBCFD8` / `#F6E1E8`.
  - Typography: Playfair Display (list titles & calligraphy), Nunito (UI), Fira Mono (amounts, dates, addresses).
  - Signature Components:
    - `WishBox.tsx`: Tall rounded gift box filling from the bottom with raspberry gradient as funded, with realistic hanging tag showing target/raised, room counter, and claim/refund status stickers.
    - `WishShelf.tsx`: Responsive gift shelf (strictly 1 box per row at 360px mobile).
    - `TitleCard.tsx`: Celebratory header card with angled countdown ribbon, host attribution with copy button, and progress metrics.
    - `GuestBook.tsx`: Flowing, handwritten-style gift note list (not a table) in chronological order.
    - `EnvelopeCard.tsx` & `EnvelopeGallery.tsx`: Gallery of ribbon-tied envelopes (no plain cards).
    - `GiveModal.tsx`: The one transaction drawer/modal ("Chip in for this item") with room validation and exact error copy.
    - `LimitationBlock.tsx`: Fine print panel with heading `Fine print` and the 3 exact statements from spec §3.4.
  - Routes:
    - `/`: Envelope gallery, quick stats, and limitation block.
    - `/new`: Registry creation studio with bounds checking, duration slider, and live total preview.
    - `/h/[id]`: Registry shelf with gift boxes, countdown ribbon, guest book, and give modal.
    - `/h/[id]/manage`: Host dashboard to manage wishes and claim fully funded gifts into till.
    - `/me`: Giver's gifts with refund triggers for expired underfunded wishes, hosted lists, and pending till withdrawal station.
    - `app/not-found.tsx`: Registry shelf 404 screen.

---

## 2. Verification Results

### Foundry Unit & Fuzz Tests
```bash
$ cd contracts && forge test
Ran 24 tests for test/Hamper.t.sol:HamperTest
[PASS] testFuzz_Conservation(uint128,uint128,uint128) (runs: 256)
[PASS] test_ByHost()
[PASS] test_ClaimOnlyHost()
[PASS] test_ClaimRequiresFull()
[PASS] test_CreateBounds()
[PASS] test_ExactFillAllowsClaim()
[PASS] test_FundedWishNeverRefundable()
[PASS] test_GiftPagination()
[PASS] test_GiveAddsToRaised()
[PASS] test_GiveAfterDeadlineReverts()
[PASS] test_GiveToFullReverts()
[PASS] test_HostCannotGive()
[PASS] test_LatestLists()
[PASS] test_MaxDurationBoundary()
[PASS] test_MaxLengthsBoundary()
[PASS] test_MaxWishesBoundary()
[PASS] test_MinDurationBoundary()
[PASS] test_OverfundReverts_ArgsRoom()
[PASS] test_ReentrantWithdrawBlocked()
[PASS] test_RefundOnce()
[PASS] test_RefundOnlyAfterDeadlineAndUnderfunded()
[PASS] test_SingleWishBoundary()
[PASS] test_WithdrawEmptyReverts()
[PASS] test_ZeroValueReverts()
Suite result: ok. 24 passed; 0 failed; 0 skipped
```

### Foundry Invariant Suites
```bash
Ran 3 tests for test/HamperInvariant.t.sol:HamperInvariantTest
[PASS] invariant_BalanceConservation() (runs: 256, calls: 128000, reverts: 0)
[PASS] invariant_NeverClaimedAndRefunded() (runs: 256, calls: 128000, reverts: 0)
[PASS] invariant_RaisedNotExceedTarget() (runs: 256, calls: 128000, reverts: 0)
Suite result: ok. 3 passed; 0 failed; 0 skipped
```

### Mutation Analysis
- 25/25 mutants killed across all core functions (`create`, `give`, `claim`, `refund`, `withdraw`).
- Kill rate: **100%**. Full mutant breakdown documented in `contracts/DECISIONS.md`.

### Vitest Unit, Lint & Integration Tests
```bash
$ npm test && npx vitest run test/integration
✓ lib/__tests__/wallet.test.ts (6 tests)
✓ lib/botchain/__tests__/wagmi-chains.test.ts (2 tests)
✓ lib/botchain/__tests__/active-chain.test.ts (5 tests)
✓ lib/__tests__/hamper.test.ts (7 tests)
✓ lib/botchain/__tests__/chain.test.ts (10 tests)
✓ lib/botchain/__tests__/amount.test.ts (7 tests)
✓ lib/__tests__/contract-limits.test.ts (1 test)
✓ lib/botchain/__tests__/deployment.test.ts (4 tests)
✓ test/lint/hook-deps.test.ts (4 tests)
Test Files  9 passed (9)
Tests       46 passed (46)

✓ test/integration/abi-matches-contract.test.ts (4 tests)
✓ test/integration/hamper.test.ts (6 tests)
Test Files  2 passed (2)
Tests       10 passed (10)
```

### Browser Walkthrough (`scripts/browser-walkthrough.mjs`)
- Executed automated Headless Chrome CDP walkthrough across Desktop (1280px) and Mobile (360px).
- Verified **0px horizontal overflow** across all routes (`/`, `/new`, `/h/1`, `/h/1/manage`, `/me`, `/_not-found`).
- Verified **strictly 1 gift box per row** at 360px.
- Verified `--menu-*` contrast tokens and 3 shared UI footer links.
- Verified limitation copy with all 3 statements.
- Executed 5 live on-chain transactions via injected mock wallet:
  1. Dave chipped in 0.04 BOT to Wish 1 on `/h/1` ("Playmat"), filling it to 100% (0.10 BOT).
  2. Charlie claimed 0.15 BOT for Wish 0 on `/h/3/manage` into till.
  3. Charlie refunded 0.05 BOT for expired underfunded Wish 1 on `/me`.
  4. Charlie withdrew total till balance (0.20 BOT) to wallet on `/me`.
  5. Alice created a new registry on `/new`, verified redirect and creation of List 5 on-chain.
- Asserted **0 browser console errors**.

### Static Policy Checks
```bash
$ python3 scripts/check-tokens.py hamper
0 project(s) with undefined tokens
$ python3 scripts/check-ui-contract.py hamper
hamper: ok
$ python3 scripts/check-distinct.py hamper
42 projects compared; 0 pair/file problem(s)
$ python3 scripts/check-honesty.py hamper
honesty: 0 finding(s) in 1 project(s)
```

---

## 3. Mainnet Activity Recipe (Labelled Developer Wallets)
1. **Wallet 1 (Host Alice)**: Calls `create("Maya's Baby Shower", ["Stroller", "Crib", "Carrier"], [2 ether, 5 ether, 1 ether], 86400)` (1 tx).
2. **Wallet 2 (Giver Bob)**: Calls `give(1, 0, "So excited for you!")` payable with 1 ether (1 tx).
3. **Wallet 3 (Giver Charlie)**: Calls `give(1, 0, "With lots of love!")` payable with 1 ether (1 tx, Wish 0 is now 100% fully funded).
4. **Wallet 4 (Giver Dave)**: Calls `give(1, 1, "Sweet dreams little one")` payable with 2 ether (1 tx, Wish 1 is at 40%).
5. **Wallet 1 (Host Alice)**: Calls `claim(1, 0)` to claim 2 ether into till (1 tx).
6. **Time advances past 1-day deadline**.
7. **Wallet 4 (Giver Dave)**: Calls `refund(1, 1, 0)` to refund 2 ether into till for underfunded wish (1 tx).
8. **Wallet 1 (Host Alice)**: Calls `withdraw()` to pull 2 ether claim revenue (1 tx).
9. **Wallet 4 (Giver Dave)**: Calls `withdraw()` to pull 2 ether refund deposit (1 tx).
Total: ≥ 9 on-chain transactions across 4 labelled wallets.
