// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title Hamper
 * @notice A gift list on BOT Chain. Funded item by item.
 * Hosts create a list of up to 10 wishes with target amounts and a list deadline.
 * Givers chip in any amount towards a specific wish, accompanied by a note.
 * Fully funded wishes can be claimed by the host at any time.
 * Underfunded wishes past deadline can be refunded to each giver in full.
 */
contract Hamper {
    // --- Limits ---
    uint64 public constant MIN_DURATION = 1 days;
    uint64 public constant MAX_DURATION = 365 days;
    uint8 public constant MIN_WISHES = 1;
    uint8 public constant MAX_WISHES = 10;
    uint8 public constant MAX_TITLE = 48;
    uint8 public constant MAX_LABEL = 32;
    uint8 public constant MAX_NOTE = 64;
    uint256 public constant MAX_PAGE = 50;

    // --- Structs ---
    struct List {
        address host;
        uint64 deadline;
        uint8 wishCount;
        string title;
    }

    struct Wish {
        uint128 target;
        uint128 raised;
        bool claimed;
        string label;
    }

    struct Gift {
        address giver;
        uint128 amount;
        bool refunded;
        string note;
    }

    // --- Storage ---
    mapping(uint256 => List) private _lists;
    mapping(uint256 => Wish[]) private _wishes;
    mapping(uint256 => mapping(uint8 => Gift[])) private _gifts;
    mapping(address => uint256[]) private _byHost;
    mapping(address => uint256) public pending;
    uint256 public listCount;

    // Reentrancy guard
    uint256 private _locked = 1;

    // --- Custom Errors ---
    error BadDuration();
    error BadWishes();
    error BadTitle();
    error BadLabel();
    error NoSuchList();
    error NoSuchWish();
    error Closed();
    error NotClosed();
    error HostCannotGive();
    error ZeroValue();
    error NoteTooLong();
    error WishFull();
    error Overfunds(uint128 room);
    error OnlyHost();
    error AlreadyClaimed();
    error NotFunded();
    error NotRefundable();
    error NoSuchGift();
    error AlreadyRefunded();
    error NothingToWithdraw();
    error TransferFailed();
    error ReentrancyGuardReentrantCall();

    // --- Events ---
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

    modifier nonReentrant() {
        if (_locked != 1) revert ReentrancyGuardReentrantCall();
        _locked = 2;
        _;
        _locked = 1;
    }

    /**
     * @notice Creates a new gift list.
     * @param title Title of the list (1..48 bytes)
     * @param labels Array of wish labels (1..32 bytes each)
     * @param targets Array of target amounts in wei (each > 0)
     * @param durationSecs Duration from now until list deadline (1..365 days)
     * @return id Created list ID (starts at 1)
     */
    function create(
        string calldata title,
        string[] calldata labels,
        uint128[] calldata targets,
        uint64 durationSecs
    ) external returns (uint256 id) {
        if (durationSecs < MIN_DURATION || durationSecs > MAX_DURATION) {
            revert BadDuration();
        }

        uint256 n = labels.length;
        if (n < MIN_WISHES || n > MAX_WISHES || n != targets.length) {
            revert BadWishes();
        }

        if (bytes(title).length == 0 || bytes(title).length > MAX_TITLE) {
            revert BadTitle();
        }

        id = ++listCount;
        uint64 deadline = uint64(block.timestamp + durationSecs);

        // forge-lint: disable-next-line(unsafe-typecast)
        uint8 count = uint8(n);

        _lists[id] = List({
            host: msg.sender,
            deadline: deadline,
            wishCount: count,
            title: title
        });

        _byHost[msg.sender].push(id);

        for (uint256 i = 0; i < n; i++) {
            if (bytes(labels[i]).length == 0 || bytes(labels[i]).length > MAX_LABEL) {
                revert BadLabel();
            }
            if (targets[i] == 0) {
                revert BadWishes();
            }

            _wishes[id].push(Wish({
                target: targets[i],
                raised: 0,
                claimed: false,
                label: labels[i]
            }));
        }

        emit Created(id, msg.sender, deadline, count, title);
    }

    /**
     * @notice Chip in towards a specific wish in a list.
     * @param id List ID
     * @param wish Wish index within the list (0-indexed)
     * @param note Short message (up to 64 bytes)
     */
    function give(
        uint256 id,
        uint8 wish,
        string calldata note
    ) external payable {
        if (id == 0 || id > listCount) revert NoSuchList();
        List storage lst = _lists[id];

        if (block.timestamp >= lst.deadline) revert Closed();
        if (wish >= lst.wishCount) revert NoSuchWish();
        if (msg.sender == lst.host) revert HostCannotGive();
        if (msg.value == 0) revert ZeroValue();
        if (bytes(note).length > MAX_NOTE) revert NoteTooLong();

        Wish storage w = _wishes[id][wish];
        if (w.claimed || w.raised >= w.target) revert WishFull();

        uint128 remaining = w.target - w.raised;
        if (msg.value > remaining) revert Overfunds(remaining);

        uint128 amt = uint128(msg.value);
        w.raised += amt;

        _gifts[id][wish].push(Gift({
            giver: msg.sender,
            amount: amt,
            refunded: false,
            note: note
        }));

        emit Gave(id, wish, msg.sender, amt, note);
    }

    /**
     * @notice Host claims funds from a fully funded wish.
     * @param id List ID
     * @param wish Wish index within the list
     */
    function claim(uint256 id, uint8 wish) external nonReentrant {
        if (id == 0 || id > listCount) revert NoSuchList();
        List storage lst = _lists[id];

        if (wish >= lst.wishCount) revert NoSuchWish();
        if (msg.sender != lst.host) revert OnlyHost();

        Wish storage w = _wishes[id][wish];
        if (w.claimed) revert AlreadyClaimed();
        if (w.raised < w.target) revert NotFunded();

        w.claimed = true;
        uint128 amount = w.raised;
        pending[lst.host] += amount;

        emit Claimed(id, wish, amount);
    }

    /**
     * @notice Triggers refund for an underfunded wish gift after deadline.
     * @param id List ID
     * @param wish Wish index within the list
     * @param giftIndex Index of the gift in the wish's gift array
     */
    function refund(
        uint256 id,
        uint8 wish,
        uint32 giftIndex
    ) external nonReentrant {
        if (id == 0 || id > listCount) revert NoSuchList();
        List storage lst = _lists[id];

        if (wish >= lst.wishCount) revert NoSuchWish();
        if (block.timestamp < lst.deadline) revert NotClosed();

        Wish storage w = _wishes[id][wish];
        // Fully funded wishes can never be refunded, even after deadline
        if (w.claimed || w.raised >= w.target) revert NotRefundable();

        Gift[] storage giftsArr = _gifts[id][wish];
        if (giftIndex >= giftsArr.length) revert NoSuchGift();

        Gift storage g = giftsArr[giftIndex];
        if (g.refunded) revert AlreadyRefunded();

        g.refunded = true;
        pending[g.giver] += g.amount;

        emit Refunded(id, wish, g.giver, g.amount);
    }

    /**
     * @notice Withdraws pending balance to caller's wallet via pull payment.
     */
    function withdraw() external nonReentrant {
        uint256 amount = pending[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        pending[msg.sender] = 0;

        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Withdrawn(msg.sender, amount);
    }

    // --- Views ---

    function listOf(uint256 id) external view returns (List memory) {
        if (id == 0 || id > listCount) revert NoSuchList();
        return _lists[id];
    }

    function wishesOf(uint256 id) external view returns (Wish[] memory) {
        if (id == 0 || id > listCount) revert NoSuchList();
        return _wishes[id];
    }

    function wishOf(uint256 id, uint8 wish) external view returns (Wish memory) {
        if (id == 0 || id > listCount) revert NoSuchList();
        if (wish >= _lists[id].wishCount) revert NoSuchWish();
        return _wishes[id][wish];
    }

    function giftCount(uint256 id, uint8 wish) external view returns (uint256) {
        if (id == 0 || id > listCount) revert NoSuchList();
        if (wish >= _lists[id].wishCount) revert NoSuchWish();
        return _gifts[id][wish].length;
    }

    function giftsOf(
        uint256 id,
        uint8 wish,
        uint256 offset,
        uint256 count
    ) external view returns (Gift[] memory slice) {
        if (id == 0 || id > listCount) revert NoSuchList();
        if (wish >= _lists[id].wishCount) revert NoSuchWish();

        Gift[] storage all = _gifts[id][wish];
        uint256 total = all.length;
        if (offset >= total || count == 0) {
            return new Gift[](0);
        }

        uint256 c = count > MAX_PAGE ? MAX_PAGE : count;
        if (offset + c > total) {
            c = total - offset;
        }

        slice = new Gift[](c);
        for (uint256 i = 0; i < c; i++) {
            slice[i] = all[offset + i];
        }
    }

    function room(uint256 id, uint8 wish) external view returns (uint128) {
        if (id == 0 || id > listCount) revert NoSuchList();
        if (wish >= _lists[id].wishCount) revert NoSuchWish();
        Wish storage w = _wishes[id][wish];
        if (w.claimed || w.raised >= w.target) return 0;
        return w.target - w.raised;
    }

    function byHost(address addr) external view returns (uint256[] memory) {
        return _byHost[addr];
    }

    function latest(
        uint256 offset,
        uint256 count
    )
        external
        view
        returns (
            List[] memory lists,
            uint256[] memory ids,
            uint256 total
        )
    {
        total = listCount;
        if (offset >= total || count == 0) {
            return (new List[](0), new uint256[](0), total);
        }

        uint256 c = count > MAX_PAGE ? MAX_PAGE : count;
        if (offset + c > total) {
            c = total - offset;
        }

        lists = new List[](c);
        ids = new uint256[](c);

        for (uint256 i = 0; i < c; i++) {
            uint256 id = total - offset - i;
            lists[i] = _lists[id];
            ids[i] = id;
        }
    }
}
