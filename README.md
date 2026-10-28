# Hamper

> A gift list. Funded item by item.

An all-or-nothing multi-item gift registry in native BOT where hosts create wishlists with discrete targets and a shared deadline. Friends chip in any amount toward specific items with heartfelt notes. Fully funded wishes are claimed by the host into their pull-payment till; wishes that remain underfunded when the deadline passes are refunded in full to the givers. Built for the BOT Chain ecosystem under **Archetype AL · Registry shelf**.

## What it is

A host (a wedding couple, a new parent, a team organizing a farewell gift) creates a registry on BOT Chain with up to **10 wishes**, each with a target amount in BOT and a single list deadline (1 to 365 days):
- Friends **chip in** any amount toward a specific wish, accompanied by a note up to 64 characters.
- Overfunding is blocked at the contract level (`Overfunds(room)`).
- When a wish reaches 100% of its target, the host can **claim** the funds into their pull-payment till at any time (even after the deadline).
- If a wish is *not* fully funded by the deadline, any giver may trigger a 100% **refund** of their gift into their till.
- The host cannot give to their own list (`HostCannotGive`).
- All till earnings and refunds are paid out securely via zero-then-call non-reentrant pull payments (`withdraw()`).

## What it cannot do (stated on the main screen)

- **All or nothing, item by item.** An underfunded wish is refunded in full at the deadline; nothing partial is paid out.
- The host decides what to buy with a funded wish; the contract cannot make them buy it.
- A gift can't be taken back once given, except by that deadline refund.

## Archetype AL · Registry shelf

- **Ground**: Pure white `#FFFFFF`
- **Surface**: Warm soft rose `#FFF4F8` / Elevated `#FDF0F4` / Envelope `#FFFDFC`
- **Text**: Plum ink `#3A1D28`, muted plum `#6E4655`, tertiary `#9B7584`
- **Accent**: Raspberry `#E0457B` (`#FFFFFF` ink)
- **Borders**: Delicate plum border `#EBCFD8`, subtle line `#F6E1E8`
- **Wallet Menu**: `--menu-bg #FFFFFF` · `--menu-fg #3A1D28` · `--menu-muted #6E4655` · `--menu-border #EBCFD8` · `--menu-hover-bg #FBE8EE` · `--menu-danger #B3261E`
- **Typography**: Playfair Display (list titles & cursive calligraphy), Nunito (warm, friendly UI), Fira Mono (targets, raised amounts, addresses).

## Signature Components

- **Wish Box (`WishBox.tsx`)**: A tall rounded rectangle gift box with a ribbon pattern and bow. Fills fluidly from the bottom with raspberry gradient as contributions arrive. Features a realistic tilted hanging tag displaying target and raised amounts, room indicator, and status stickers ("Claimed", "100% Fully Funded!", "Closed · Underfunded"). On 360px mobile viewports, strictly one box per row.
- **Wish Shelf (`WishShelf.tsx`)**: Responsive grid organizing wish boxes into a celebratory gift shelf.
- **Title Card (`TitleCard.tsx`)**: Celebratory header card with an angled countdown ribbon ("3 days left", "Closed"), host attribution with one-click copy, and registry metric summaries.
- **Guest Book (`GuestBook.tsx`)**: Flowing, handwritten-style notebook list (not a table) presenting gift notes in chronological order with giver badges and formatted BOT amounts.
- **Envelope Cards & Gallery (`EnvelopeCard.tsx` & `EnvelopeGallery.tsx`)**: Homepage `/` renders registries exclusively as ribbon-tied envelopes with triangular flap styling, vertical ribbon tie, and wax seal button.
- **Limitation Block (`LimitationBlock.tsx`)**: Protocol fine print panel with heading `Fine print` and the 3 exact statements from spec §3.4.

## Contract Architecture (`contracts/src/Hamper.sol`)

- `create(string title, string[] labels, uint128[] targets, uint64 durationSecs) returns (uint256 id)`: Enforces 1..10 wishes, matching arrays, positive targets, title ≤ 48 bytes, labels ≤ 32 bytes, duration 86,400s..31,536,000s. Emits `Created`.
- `give(uint256 id, uint8 wish, string note) payable`: Enforces before deadline (`Closed`), valid wish, host barred (`HostCannotGive`), `msg.value > 0`, wish not full (`WishFull`), `msg.value <= target - raised` (`Overfunds(room)`). Emits `Gave`.
- `claim(uint256 id, uint8 wish)`: Host only (`OnlyHost`); requires `raised == target` (`NotFunded`); not claimed. Credits `pending[host] += raised`. Emits `Claimed`.
- `refund(uint256 id, uint8 wish, uint32 giftIndex)`: Permissionless past deadline (`NotClosed`), unclaimed and underfunded (`NotRefundable`), gift not already refunded. Credits `pending[giver] += amount`. Emits `Refunded`.
- `withdraw()`: Non-reentrant pull payment withdrawal for hosts and givers.
- Views: `listOf(id)`, `wishesOf(id)`, `wishOf(id, wish)`, `giftsOf(id, wish, offset, count)` (≤ 50), `room(id, wish)`, `latest(offset, count)` (≤ 50), `byHost(addr)`, `pending(addr)`, `listCount()`.

## Verification & Testing

- **Foundry Contracts**: 24 unit & fuzz tests + 3 stateful invariant suites (128,000 calls across 256 runs) passing with 0 reverts.
- **Mutation Analysis**: 25/25 mutants killed (100% kill rate, documented in `DECISIONS.md`).
- **Integration**: 4 ABI type matching tests + 6 on-chain integration tests passing on port `8633`.
- **Browser Walkthrough**: Automated Headless Chrome CDP walkthrough across Desktop (1280px) and Mobile (360px) verifying 0px overflow, footer links, limitation copy, Dave chipping in 0.04 BOT on `/h/1`, Charlie claiming 0.15 BOT on `/h/3/manage`, Charlie refunding 0.05 BOT on `/me`, Charlie till withdrawal, and Alice creating a new registry with **0 console errors**.
