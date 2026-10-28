// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {Hamper} from "../src/Hamper.sol";

contract HamperHandler is Test {
    Hamper public hamper;

    address[] public users;
    uint256[] public listIds;

    constructor(Hamper _hamper, address[] memory _users) {
        hamper = _hamper;
        users = _users;
    }

    function createList(
        uint8 numWishes,
        uint64 durationSecs,
        uint8 userSeed
    ) external {
        uint256 n = bound(numWishes, 1, 10);
        uint64 dur = uint64(bound(durationSecs, 1 days, 365 days));
        address host = users[userSeed % users.length];

        string[] memory labels = new string[](n);
        uint128[] memory targets = new uint128[](n);

        for (uint256 i = 0; i < n; i++) {
            labels[i] = "Wish Item";
            targets[i] = uint128(1 ether * (i + 1));
        }

        vm.prank(host);
        uint256 id = hamper.create("Registry", labels, targets, dur);
        listIds.push(id);
    }

    function give(
        uint256 listIdx,
        uint8 wishIdx,
        uint128 amount,
        uint8 userSeed
    ) external {
        if (listIds.length == 0) return;
        uint256 id = listIds[listIdx % listIds.length];
        Hamper.List memory lst = hamper.listOf(id);

        if (block.timestamp >= lst.deadline) return;
        if (wishIdx >= lst.wishCount) return;

        address giver = users[userSeed % users.length];
        if (giver == lst.host) return;

        uint128 rem = hamper.room(id, wishIdx);
        if (rem == 0) return;

        uint128 sendAmt = uint128(bound(amount, 1, rem));
        vm.deal(giver, address(giver).balance + sendAmt);

        vm.prank(giver);
        hamper.give{value: sendAmt}(id, wishIdx, "Gift");
    }

    function claim(uint256 listIdx, uint8 wishIdx) external {
        if (listIds.length == 0) return;
        uint256 id = listIds[listIdx % listIds.length];
        Hamper.List memory lst = hamper.listOf(id);

        if (wishIdx >= lst.wishCount) return;

        Hamper.Wish memory w = hamper.wishOf(id, wishIdx);
        if (w.claimed || w.raised < w.target) return;

        vm.prank(lst.host);
        hamper.claim(id, wishIdx);
    }

    function refund(
        uint256 listIdx,
        uint8 wishIdx,
        uint32 giftIdx
    ) external {
        if (listIds.length == 0) return;
        uint256 id = listIds[listIdx % listIds.length];
        Hamper.List memory lst = hamper.listOf(id);

        if (block.timestamp < lst.deadline) return;
        if (wishIdx >= lst.wishCount) return;

        Hamper.Wish memory w = hamper.wishOf(id, wishIdx);
        if (w.claimed || w.raised >= w.target) return;

        uint256 count = hamper.giftCount(id, wishIdx);
        if (count == 0) return;

        uint32 gIdx = uint32(bound(giftIdx, 0, count - 1));
        Hamper.Gift[] memory gSlice = hamper.giftsOf(id, wishIdx, gIdx, 1);
        if (gSlice.length == 0 || gSlice[0].refunded) return;

        hamper.refund(id, wishIdx, gIdx);
    }

    function withdraw(uint8 userSeed) external {
        address user = users[userSeed % users.length];
        if (hamper.pending(user) == 0) return;

        vm.prank(user);
        hamper.withdraw();
    }

    function warpForward(uint32 secondsForward) external {
        uint32 s = uint32(bound(secondsForward, 1 hours, 30 days));
        vm.warp(block.timestamp + s);
    }

    function getListIds() external view returns (uint256[] memory) {
        return listIds;
    }
}

contract HamperInvariantTest is StdInvariant, Test {
    Hamper public hamper;
    HamperHandler public handler;

    address[] public users;

    function setUp() public {
        hamper = new Hamper();

        users.push(address(0x1111));
        users.push(address(0x2222));
        users.push(address(0x3333));
        users.push(address(0x4444));
        users.push(address(0x5555));

        handler = new HamperHandler(hamper, users);
        targetContract(address(handler));
    }

    // Invariant 1: Total contract balance conservation
    // balance == sum(pending for all users) + sum(raised for all wishes that are not claimed and whose gifts are not refunded)
    function invariant_BalanceConservation() public view {
        uint256 totalPending = 0;
        for (uint256 i = 0; i < users.length; i++) {
            totalPending += hamper.pending(users[i]);
        }

        uint256 totalUnclaimedUnrefunded = 0;
        uint256 totalLists = hamper.listCount();

        for (uint256 id = 1; id <= totalLists; id++) {
            Hamper.Wish[] memory wishes = hamper.wishesOf(id);
            for (uint8 w = 0; w < wishes.length; w++) {
                if (wishes[w].claimed) {
                    // Claimed wishes moved to pending[host]
                    continue;
                }
                // Sum unrefunded gifts in this wish
                uint256 giftTotal = hamper.giftCount(id, w);
                for (uint256 g = 0; g < giftTotal; g++) {
                    Hamper.Gift[] memory gArr = hamper.giftsOf(id, w, g, 1);
                    if (gArr.length > 0 && !gArr[0].refunded) {
                        totalUnclaimedUnrefunded += gArr[0].amount;
                    }
                }
            }
        }

        assertEq(address(hamper).balance, totalPending + totalUnclaimedUnrefunded);
    }

    // Invariant 2: Raised <= Target for every wish
    function invariant_RaisedNotExceedTarget() public view {
        uint256 totalLists = hamper.listCount();
        for (uint256 id = 1; id <= totalLists; id++) {
            Hamper.Wish[] memory wishes = hamper.wishesOf(id);
            for (uint8 w = 0; w < wishes.length; w++) {
                assertLe(wishes[w].raised, wishes[w].target);
            }
        }
    }

    // Invariant 3: Wish never both claimed and refunded
    function invariant_NeverClaimedAndRefunded() public view {
        uint256 totalLists = hamper.listCount();
        for (uint256 id = 1; id <= totalLists; id++) {
            Hamper.Wish[] memory wishes = hamper.wishesOf(id);
            for (uint8 w = 0; w < wishes.length; w++) {
                if (wishes[w].claimed) {
                    uint256 giftTotal = hamper.giftCount(id, w);
                    for (uint256 g = 0; g < giftTotal; g++) {
                        Hamper.Gift[] memory gArr = hamper.giftsOf(id, w, g, 1);
                        if (gArr.length > 0) {
                            assertFalse(gArr[0].refunded);
                        }
                    }
                }
            }
        }
    }
}
