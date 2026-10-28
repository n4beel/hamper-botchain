// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Test} from "forge-std/Test.sol";
import {Hamper} from "../src/Hamper.sol";

contract Attacker {
    Hamper public hamper;
    bool public attacked;
    bytes4 public caughtRevert;

    constructor(Hamper _hamper) {
        hamper = _hamper;
    }

    function attack() external {
        hamper.withdraw();
    }

    receive() external payable {
        if (!attacked) {
            attacked = true;
            try hamper.withdraw() {
                // should not succeed
            } catch (bytes memory reason) {
                if (reason.length >= 4) {
                    caughtRevert = bytes4(reason);
                }
            }
        }
    }
}

contract HamperTest is Test {
    Hamper public hamper;

    address public host = address(0x1111);
    address public alice = address(0x2222);
    address public bob = address(0x3333);
    address public charlie = address(0x4444);

    event Created(
        uint256 indexed id,
        address indexed host,
        uint64 deadline,
        uint8 wishCount,
        string title
    );
    event Gave(
        uint256 indexed id,
        uint8 indexed wish,
        address indexed giver,
        uint128 amount,
        string note
    );
    event Claimed(uint256 indexed id, uint8 indexed wish, uint128 amount);
    event Refunded(
        uint256 indexed id,
        uint8 indexed wish,
        address indexed giver,
        uint128 amount
    );
    event Withdrawn(address indexed user, uint256 amount);

    function setUp() public {
        hamper = new Hamper();
        vm.deal(host, 100 ether);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(charlie, 100 ether);
    }

    // Helper to create a standard 2-wish list
    function _createStandardList(uint64 durationSecs) internal returns (uint256) {
        string[] memory labels = new string[](2);
        labels[0] = "Espresso Machine";
        labels[1] = "Coffee Beans (1 yr)";

        uint128[] memory targets = new uint128[](2);
        targets[0] = 1 ether;
        targets[1] = 0.5 ether;

        vm.prank(host);
        return hamper.create("Wedding Registry", labels, targets, durationSecs);
    }

    // --- Create Tests ---

    function test_CreateBounds() public {
        // Valid creation
        uint256 id = _createStandardList(7 days);
        assertEq(id, 1);
        assertEq(hamper.listCount(), 1);

        Hamper.List memory l = hamper.listOf(1);
        assertEq(l.host, host);
        assertEq(l.wishCount, 2);
        assertEq(l.title, "Wedding Registry");
        assertEq(l.deadline, block.timestamp + 7 days);

        Hamper.Wish[] memory wishes = hamper.wishesOf(1);
        assertEq(wishes.length, 2);
        assertEq(wishes[0].target, 1 ether);
        assertEq(wishes[0].raised, 0);
        assertFalse(wishes[0].claimed);
        assertEq(wishes[0].label, "Espresso Machine");

        // Duration too short (< 1 day)
        string[] memory labels = new string[](1);
        labels[0] = "Gift A";
        uint128[] memory targets = new uint128[](1);
        targets[0] = 1 ether;

        vm.prank(host);
        vm.expectRevert(Hamper.BadDuration.selector);
        hamper.create("Title", labels, targets, 1 days - 1);

        // Duration too long (> 365 days)
        vm.prank(host);
        vm.expectRevert(Hamper.BadDuration.selector);
        hamper.create("Title", labels, targets, 365 days + 1);

        // Wish count 0
        string[] memory zeroLabels = new string[](0);
        uint128[] memory zeroTargets = new uint128[](0);
        vm.prank(host);
        vm.expectRevert(Hamper.BadWishes.selector);
        hamper.create("Title", zeroLabels, zeroTargets, 7 days);

        // Wish count > 10
        string[] memory elevenLabels = new string[](11);
        uint128[] memory elevenTargets = new uint128[](11);
        for (uint256 i = 0; i < 11; i++) {
            elevenLabels[i] = "Item";
            elevenTargets[i] = 1 ether;
        }
        vm.prank(host);
        vm.expectRevert(Hamper.BadWishes.selector);
        hamper.create("Title", elevenLabels, elevenTargets, 7 days);

        // Target length mismatch
        uint128[] memory mismatchTargets = new uint128[](2);
        mismatchTargets[0] = 1 ether;
        mismatchTargets[1] = 2 ether;
        vm.prank(host);
        vm.expectRevert(Hamper.BadWishes.selector);
        hamper.create("Title", labels, mismatchTargets, 7 days);

        // Zero target amount
        uint128[] memory zeroAmtTargets = new uint128[](1);
        zeroAmtTargets[0] = 0;
        vm.prank(host);
        vm.expectRevert(Hamper.BadWishes.selector);
        hamper.create("Title", labels, zeroAmtTargets, 7 days);

        // Empty title
        vm.prank(host);
        vm.expectRevert(Hamper.BadTitle.selector);
        hamper.create("", labels, targets, 7 days);

        // Empty label
        string[] memory emptyLabel = new string[](1);
        emptyLabel[0] = "";
        vm.prank(host);
        vm.expectRevert(Hamper.BadLabel.selector);
        hamper.create("Title", emptyLabel, targets, 7 days);
    }

    function test_MinDurationBoundary() public {
        string[] memory labels = new string[](1);
        labels[0] = "Item";
        uint128[] memory targets = new uint128[](1);
        targets[0] = 1 ether;
        vm.prank(host);
        uint256 id = hamper.create("Title", labels, targets, 1 days);
        assertEq(hamper.listOf(id).deadline, block.timestamp + 1 days);
    }

    function test_MaxDurationBoundary() public {
        string[] memory labels = new string[](1);
        labels[0] = "Item";
        uint128[] memory targets = new uint128[](1);
        targets[0] = 1 ether;
        vm.prank(host);
        uint256 id = hamper.create("Title", labels, targets, 365 days);
        assertEq(hamper.listOf(id).deadline, block.timestamp + 365 days);
    }

    function test_SingleWishBoundary() public {
        string[] memory labels = new string[](1);
        labels[0] = "Item";
        uint128[] memory targets = new uint128[](1);
        targets[0] = 1 ether;
        vm.prank(host);
        uint256 id = hamper.create("Title", labels, targets, 7 days);
        assertEq(hamper.listOf(id).wishCount, 1);
    }

    function test_MaxWishesBoundary() public {
        string[] memory labels = new string[](10);
        uint128[] memory targets = new uint128[](10);
        for (uint256 i = 0; i < 10; i++) {
            labels[i] = "Item";
            targets[i] = 1 ether;
        }
        vm.prank(host);
        uint256 id = hamper.create("Title", labels, targets, 7 days);
        assertEq(hamper.listOf(id).wishCount, 10);
    }

    function test_MaxLengthsBoundary() public {
        // 48-char title
        string memory title48 = "123456789012345678901234567890123456789012345678";
        // 32-char label
        string[] memory labels = new string[](1);
        labels[0] = "12345678901234567890123456789012";
        uint128[] memory targets = new uint128[](1);
        targets[0] = 1 ether;

        vm.prank(host);
        uint256 id = hamper.create(title48, labels, targets, 7 days);
        assertEq(hamper.listOf(id).title, title48);

        // 64-char note
        string memory note64 = "1234567890123456789012345678901234567890123456789012345678901234";
        vm.prank(alice);
        hamper.give{value: 0.1 ether}(id, 0, note64);
        assertEq(hamper.giftsOf(id, 0, 0, 1)[0].note, note64);

        // 65-char note reverts
        string memory note65 = "12345678901234567890123456789012345678901234567890123456789012345";
        vm.prank(alice);
        vm.expectRevert(Hamper.NoteTooLong.selector);
        hamper.give{value: 0.1 ether}(id, 0, note65);
    }

    function test_ZeroValueReverts() public {
        uint256 id = _createStandardList(7 days);
        vm.prank(alice);
        vm.expectRevert(Hamper.ZeroValue.selector);
        hamper.give{value: 0}(id, 0, "Zero");
    }

    function test_GiveToFullReverts() public {
        uint256 id = _createStandardList(7 days);
        vm.prank(alice);
        hamper.give{value: 1 ether}(id, 0, "Full");

        vm.prank(bob);
        vm.expectRevert(Hamper.WishFull.selector);
        hamper.give{value: 0.1 ether}(id, 0, "Try more");
    }

    function test_WithdrawEmptyReverts() public {
        vm.prank(alice);
        vm.expectRevert(Hamper.NothingToWithdraw.selector);
        hamper.withdraw();
    }

    // --- Give Tests ---

    function test_GiveAddsToRaised() public {
        uint256 id = _createStandardList(7 days);

        // Alice gives 0.4 ether to wish 0
        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit Gave(id, 0, alice, 0.4 ether, "Congrats both!");
        hamper.give{value: 0.4 ether}(id, 0, "Congrats both!");

        Hamper.Wish memory w = hamper.wishOf(id, 0);
        assertEq(w.raised, 0.4 ether);
        assertEq(hamper.room(id, 0), 0.6 ether);
        assertEq(hamper.giftCount(id, 0), 1);

        Hamper.Gift[] memory gifts = hamper.giftsOf(id, 0, 0, 10);
        assertEq(gifts.length, 1);
        assertEq(gifts[0].giver, alice);
        assertEq(gifts[0].amount, 0.4 ether);
        assertEq(gifts[0].note, "Congrats both!");
        assertFalse(gifts[0].refunded);

        // Bob gives 0.6 ether to wish 0 (filling it exactly)
        vm.prank(bob);
        hamper.give{value: 0.6 ether}(id, 0, "Best wishes!");

        w = hamper.wishOf(id, 0);
        assertEq(w.raised, 1 ether);
        assertEq(hamper.room(id, 0), 0);
        assertEq(hamper.giftCount(id, 0), 2);
    }

    function test_OverfundReverts_ArgsRoom() public {
        uint256 id = _createStandardList(7 days);

        vm.prank(alice);
        hamper.give{value: 0.8 ether}(id, 0, "Initial chip in");

        // Remaining room is 0.2 ether. Bob tries to send 0.25 ether.
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(Hamper.Overfunds.selector, 0.2 ether));
        hamper.give{value: 0.25 ether}(id, 0, "Too much");
    }

    function test_HostCannotGive() public {
        uint256 id = _createStandardList(7 days);

        vm.prank(host);
        vm.expectRevert(Hamper.HostCannotGive.selector);
        hamper.give{value: 0.1 ether}(id, 0, "Giving to myself");
    }

    function test_GiveAfterDeadlineReverts() public {
        uint256 id = _createStandardList(7 days);

        // Fast forward past deadline
        vm.warp(block.timestamp + 7 days + 1);

        vm.prank(alice);
        vm.expectRevert(Hamper.Closed.selector);
        hamper.give{value: 0.1 ether}(id, 0, "Late gift");
    }

    // --- Claim Tests ---

    function test_ExactFillAllowsClaim() public {
        uint256 id = _createStandardList(7 days);

        vm.prank(alice);
        hamper.give{value: 1 ether}(id, 0, "All for espresso!");

        // Host claims
        vm.prank(host);
        vm.expectEmit(true, true, false, true);
        emit Claimed(id, 0, 1 ether);
        hamper.claim(id, 0);

        Hamper.Wish memory w = hamper.wishOf(id, 0);
        assertTrue(w.claimed);
        assertEq(hamper.pending(host), 1 ether);

        // Claiming again reverts
        vm.prank(host);
        vm.expectRevert(Hamper.AlreadyClaimed.selector);
        hamper.claim(id, 0);
    }

    function test_ClaimOnlyHost() public {
        uint256 id = _createStandardList(7 days);

        vm.prank(alice);
        hamper.give{value: 1 ether}(id, 0, "Full");

        vm.prank(alice);
        vm.expectRevert(Hamper.OnlyHost.selector);
        hamper.claim(id, 0);
    }

    function test_ClaimRequiresFull() public {
        uint256 id = _createStandardList(7 days);

        vm.prank(alice);
        hamper.give{value: 0.9 ether}(id, 0, "Almost full");

        vm.prank(host);
        vm.expectRevert(Hamper.NotFunded.selector);
        hamper.claim(id, 0);
    }

    // --- Refund Tests ---

    function test_RefundOnlyAfterDeadlineAndUnderfunded() public {
        uint256 id = _createStandardList(7 days);

        vm.prank(alice);
        hamper.give{value: 0.4 ether}(id, 0, "Part 1");

        // Before deadline: refund reverts with NotClosed
        vm.prank(alice);
        vm.expectRevert(Hamper.NotClosed.selector);
        hamper.refund(id, 0, 0);

        // Warp past deadline
        vm.warp(block.timestamp + 7 days + 1);

        // Anyone may trigger refund for Alice's gift
        vm.prank(charlie);
        vm.expectEmit(true, true, true, true);
        emit Refunded(id, 0, alice, 0.4 ether);
        hamper.refund(id, 0, 0);

        assertEq(hamper.pending(alice), 0.4 ether);

        Hamper.Gift[] memory gifts = hamper.giftsOf(id, 0, 0, 1);
        assertTrue(gifts[0].refunded);
    }

    function test_FundedWishNeverRefundable() public {
        uint256 id = _createStandardList(7 days);

        vm.prank(alice);
        hamper.give{value: 1 ether}(id, 0, "Full funding");

        // Warp past deadline
        vm.warp(block.timestamp + 7 days + 1);

        // Even after deadline, fully funded wish cannot be refunded
        vm.prank(alice);
        vm.expectRevert(Hamper.NotRefundable.selector);
        hamper.refund(id, 0, 0);

        // Host can still claim after deadline!
        vm.prank(host);
        hamper.claim(id, 0);
        assertTrue(hamper.wishOf(id, 0).claimed);
    }

    function test_RefundOnce() public {
        uint256 id = _createStandardList(7 days);

        vm.prank(alice);
        hamper.give{value: 0.3 ether}(id, 0, "Gift");

        vm.warp(block.timestamp + 7 days + 1);

        vm.prank(alice);
        hamper.refund(id, 0, 0);

        // Refunding second time reverts
        vm.prank(alice);
        vm.expectRevert(Hamper.AlreadyRefunded.selector);
        hamper.refund(id, 0, 0);
    }

    // --- Pull Payments & Reentrancy ---

    function test_ReentrantWithdrawBlocked() public {
        Attacker attacker = new Attacker(hamper);
        vm.deal(address(attacker), 10 ether);

        // Host creates list
        string[] memory labels = new string[](1);
        labels[0] = "Gift";
        uint128[] memory targets = new uint128[](1);
        targets[0] = 1 ether;

        vm.prank(host);
        uint256 id = hamper.create("List", labels, targets, 7 days);

        // Attacker gives 0.5 ether
        vm.prank(address(attacker));
        hamper.give{value: 0.5 ether}(id, 0, "Attack gift");

        // Warp past deadline so attacker can be refunded
        vm.warp(block.timestamp + 7 days + 1);

        // Refund attacker
        hamper.refund(id, 0, 0);
        assertEq(hamper.pending(address(attacker)), 0.5 ether);

        // Attacker withdraws with reentrant callback
        attacker.attack();

        assertTrue(attacker.attacked());
        assertEq(attacker.caughtRevert(), Hamper.ReentrancyGuardReentrantCall.selector);
        assertEq(hamper.pending(address(attacker)), 0);
        assertEq(address(attacker).balance, 10 ether); // got their 0.5 back, but didn't steal extra
    }

    // --- Views & Pagination ---

    function test_GiftPagination() public {
        uint256 id = _createStandardList(7 days);

        // Alice gives 5 small gifts
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(alice);
            hamper.give{value: 0.05 ether}(id, 0, "Chip");
        }

        assertEq(hamper.giftCount(id, 0), 5);

        // Page 1: offset 0, count 2
        Hamper.Gift[] memory p1 = hamper.giftsOf(id, 0, 0, 2);
        assertEq(p1.length, 2);

        // Page 2: offset 2, count 2
        Hamper.Gift[] memory p2 = hamper.giftsOf(id, 0, 2, 2);
        assertEq(p2.length, 2);

        // Page 3: offset 4, count 2 -> returns 1
        Hamper.Gift[] memory p3 = hamper.giftsOf(id, 0, 4, 2);
        assertEq(p3.length, 1);

        // Offset out of range
        Hamper.Gift[] memory pEmpty = hamper.giftsOf(id, 0, 10, 2);
        assertEq(pEmpty.length, 0);
    }

    function test_LatestLists() public {
        _createStandardList(7 days);
        _createStandardList(14 days);

        (Hamper.List[] memory lists, uint256[] memory ids, uint256 total) = hamper.latest(0, 10);
        assertEq(total, 2);
        assertEq(lists.length, 2);
        assertEq(ids[0], 2);
        assertEq(ids[1], 1);
    }

    function test_ByHost() public {
        _createStandardList(7 days);
        _createStandardList(14 days);

        uint256[] memory hostLists = hamper.byHost(host);
        assertEq(hostLists.length, 2);
        assertEq(hostLists[0], 1);
        assertEq(hostLists[1], 2);

        assertEq(hamper.byHost(alice).length, 0);
    }

    // --- Fuzz Test: Conservation ---

    function testFuzz_Conservation(
        uint128 targetAmt,
        uint128 giftAmt1,
        uint128 giftAmt2
    ) public {
        vm.assume(targetAmt >= 1 ether && targetAmt <= 100 ether);
        vm.assume(giftAmt1 > 0 && giftAmt1 <= targetAmt);

        string[] memory labels = new string[](1);
        labels[0] = "Item";
        uint128[] memory targets = new uint128[](1);
        targets[0] = targetAmt;

        vm.prank(host);
        uint256 id = hamper.create("Fuzz Registry", labels, targets, 7 days);

        vm.deal(alice, giftAmt1);
        vm.prank(alice);
        hamper.give{value: giftAmt1}(id, 0, "Alice gift");

        uint128 remaining = targetAmt - giftAmt1;
        if (remaining > 0 && giftAmt2 > 0) {
            uint128 secondGift = giftAmt2 > remaining ? remaining : giftAmt2;
            vm.deal(bob, secondGift);
            vm.prank(bob);
            hamper.give{value: secondGift}(id, 0, "Bob gift");
        }

        Hamper.Wish memory w = hamper.wishOf(id, 0);
        assertLe(w.raised, w.target);

        // Contract balance must equal total raised
        assertEq(address(hamper).balance, w.raised);

        if (w.raised == w.target) {
            // Can claim
            vm.prank(host);
            hamper.claim(id, 0);
            assertEq(hamper.pending(host), w.raised);
            assertEq(address(hamper).balance, hamper.pending(host));

            vm.prank(host);
            hamper.withdraw();
            assertEq(address(hamper).balance, 0);
        } else {
            // Underfunded: warp past deadline and refund all gifts
            vm.warp(block.timestamp + 7 days + 1);
            uint256 count = hamper.giftCount(id, 0);
            for (uint32 g = 0; g < count; g++) {
                hamper.refund(id, 0, g);
            }
            assertEq(address(hamper).balance, hamper.pending(alice) + hamper.pending(bob));
        }
    }
}
