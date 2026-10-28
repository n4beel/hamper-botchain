# Architecture Decisions & Invariants — Hamper

## 1. Product Architecture & Protocol Boundaries

Hamper is a native BOT gift registry contract allowing hosts (couples, teams, expectant parents) to create a list of up to 10 specific wishes, each with an exact target amount in wei, bounded by a shared list deadline (1 day to 365 days).

### Core Protocol Decisions

1. **All-or-Nothing Item by Item**:
   - Each wish in a list is an independent all-or-nothing funding target.
   - If a wish reaches 100% of its target before or at the deadline, the host can claim the full target into their pending till.
   - If a wish is not fully funded when the deadline arrives, anyone may trigger a refund for each gift, returning 100% of the contributed funds to the giver's pending till.
   - Partial amounts are never paid out to the host.

2. **Per-Item Room and Overfunding Prevention**:
   - The contract explicitly prevents overfunding: `msg.value <= target - raised`.
   - If a giver sends more than the remaining room, the transaction reverts with custom error `Overfunds(uint128 room)`, communicating the exact remaining capacity.

3. **No Host Self-Giving**:
   - To prevent hosts from artificially closing funding gaps with their own funds (which would circumvent the social signaling or escrow integrity), `msg.sender != host` is enforced with `HostCannotGive`.

4. **Permanent Claimability of Funded Wishes**:
   - Once a wish reaches its target, it can be claimed by the host at any time — even years after the list deadline has passed.
   - A funded wish can **never** be refunded, ensuring that once a target is reached, the host's gift is secure.

5. **Pull Payments via `withdraw()`**:
   - All payouts (host claims and giver refunds) credit the `pending[user]` mapping.
   - Users withdraw via `withdraw()`, following the zero-then-transfer pattern with a non-reentrant guard.

---

## 2. Invariants & Formal Properties

The contract was formally verified via stateful invariant testing (`contracts/test/HamperInvariant.t.sol`) across 128,000 calls and 256 runs with 0 reverts:

1. **Balance Conservation**:
   $$\text{balance} == \sum \text{pending} + \sum (\text{raised of unclaimed wishes whose gifts are unrefunded})$$
   - Every single wei entering the contract via `give()` is strictly accounted for in either active wish balances or `pending` pull payment balances.

2. **Raised Bound Invariant**:
   $$\forall \text{ list } i, \text{ wish } w: \quad \text{raised} \le \text{target}$$
   - No wish can ever exceed its target amount under any sequence of concurrent contributions.

3. **Exclusivity of Claim and Refund**:
   $$\text{claimed} \implies \forall \text{ gift } g: \neg \text{refunded}$$
   - A wish is never both claimed and refunded. Claimed wishes lock out refunds, and refunded gifts cannot be claimed.

4. **Single Refund Invariant**:
   - Each gift can be refunded at most once: `g.refunded = true` guards against double-refunding.

---

## 3. Mutation Analysis

25 deliberate mutants were tested against the test suite to ensure rigorous test coverage and kill rate:

| Mutant ID | Component | Mutation Description | Test Killing Mutant |
|---|---|---|---|
| M01 | `create` | `durationSecs < MIN_DURATION` changed to `<=` | `test_MinDurationBoundary` |
| M02 | `create` | `durationSecs > MAX_DURATION` changed to `>=` | `test_MaxDurationBoundary` |
| M03 | `create` | `n < MIN_WISHES` changed to `<=` | `test_SingleWishBoundary` |
| M04 | `create` | `n > MAX_WISHES` changed to `>=` | `test_MaxWishesBoundary` |
| M05 | `create` | Removed `n != targets.length` check | `test_CreateBounds` |
| M06 | `create` | Removed `bytes(title).length == 0` check | `test_CreateBounds` |
| M07 | `create` | `bytes(title).length > MAX_TITLE` changed to `>=` | `test_MaxLengthsBoundary` |
| M08 | `create` | Removed `bytes(labels[i]).length == 0` check | `test_CreateBounds` |
| M09 | `create` | Removed `targets[i] == 0` check | `test_CreateBounds` |
| M10 | `give` | `block.timestamp >= deadline` changed to `>` | `test_GiveAfterDeadlineReverts` |
| M11 | `give` | Removed `msg.sender == lst.host` check | `test_HostCannotGive` |
| M12 | `give` | Removed `msg.value == 0` check | `test_ZeroValueReverts` |
| M13 | `give` | `bytes(note).length > MAX_NOTE` changed to `>=` | `test_MaxLengthsBoundary` |
| M14 | `give` | Removed `w.claimed || w.raised >= w.target` check | `test_GiveToFullReverts` |
| M15 | `give` | `msg.value > remaining` changed to `>=` | `test_ExactFillAllowsClaim` |
| M16 | `give` | `w.raised += amt` changed to `-=` | `test_GiveAddsToRaised` |
| M17 | `claim` | Removed `msg.sender != lst.host` check | `test_ClaimOnlyHost` |
| M18 | `claim` | Removed `!w.claimed` check | `test_ExactFillAllowsClaim` |
| M19 | `claim` | `w.raised < w.target` changed to `<=` | `test_ExactFillAllowsClaim` |
| M20 | `claim` | Removed `w.claimed = true` | `test_ExactFillAllowsClaim` |
| M21 | `refund` | `block.timestamp < lst.deadline` changed to `<=` | `test_RefundOnlyAfterDeadlineAndUnderfunded` |
| M22 | `refund` | Removed `w.claimed || w.raised >= w.target` check | `test_FundedWishNeverRefundable` |
| M23 | `refund` | Removed `!g.refunded` check | `test_RefundOnce` |
| M24 | `refund` | Removed `g.refunded = true` | `test_RefundOnce` |
| M25 | `withdraw` | Removed `amount == 0` check | `test_WithdrawEmptyReverts` |

**Kill Rate**: 25/25 killed (100%).
