export const hamperAbi = [
  // --- Functions ---
  {
    type: "function",
    name: "create",
    stateMutability: "nonpayable",
    inputs: [
      { name: "title", type: "string" },
      { name: "labels", type: "string[]" },
      { name: "targets", type: "uint128[]" },
      { name: "durationSecs", type: "uint64" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function",
    name: "give",
    stateMutability: "payable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "wish", type: "uint8" },
      { name: "note", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "wish", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "refund",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "wish", type: "uint8" },
      { name: "giftIndex", type: "uint32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "listOf",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "host", type: "address" },
          { name: "deadline", type: "uint64" },
          { name: "wishCount", type: "uint8" },
          { name: "title", type: "string" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "wishesOf",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "target", type: "uint128" },
          { name: "raised", type: "uint128" },
          { name: "claimed", type: "bool" },
          { name: "label", type: "string" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "wishOf",
    stateMutability: "view",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "wish", type: "uint8" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "target", type: "uint128" },
          { name: "raised", type: "uint128" },
          { name: "claimed", type: "bool" },
          { name: "label", type: "string" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "giftCount",
    stateMutability: "view",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "wish", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "giftsOf",
    stateMutability: "view",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "wish", type: "uint8" },
      { name: "offset", type: "uint256" },
      { name: "count", type: "uint256" },
    ],
    outputs: [
      {
        name: "slice",
        type: "tuple[]",
        components: [
          { name: "giver", type: "address" },
          { name: "amount", type: "uint128" },
          { name: "refunded", type: "bool" },
          { name: "note", type: "string" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "room",
    stateMutability: "view",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "wish", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint128" }],
  },
  {
    type: "function",
    name: "latest",
    stateMutability: "view",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "count", type: "uint256" },
    ],
    outputs: [
      {
        name: "lists",
        type: "tuple[]",
        components: [
          { name: "host", type: "address" },
          { name: "deadline", type: "uint64" },
          { name: "wishCount", type: "uint8" },
          { name: "title", type: "string" },
        ],
      },
      { name: "ids", type: "uint256[]" },
      { name: "total", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "byHost",
    stateMutability: "view",
    inputs: [{ name: "addr", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "pending",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "listCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "MIN_DURATION",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    type: "function",
    name: "MAX_DURATION",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    type: "function",
    name: "MIN_WISHES",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "MAX_WISHES",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "MAX_TITLE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "MAX_LABEL",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "MAX_NOTE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "MAX_PAGE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  // --- Events ---
  {
    type: "event",
    name: "Created",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "host", type: "address", indexed: true },
      { name: "deadline", type: "uint64", indexed: false },
      { name: "wishCount", type: "uint8", indexed: false },
      { name: "title", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Gave",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "wish", type: "uint8", indexed: true },
      { name: "giver", type: "address", indexed: true },
      { name: "amount", type: "uint128", indexed: false },
      { name: "note", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "wish", type: "uint8", indexed: true },
      { name: "amount", type: "uint128", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Refunded",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "wish", type: "uint8", indexed: true },
      { name: "giver", type: "address", indexed: true },
      { name: "amount", type: "uint128", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },

  // --- Errors ---
  { type: "error", name: "BadDuration", inputs: [] },
  { type: "error", name: "BadWishes", inputs: [] },
  { type: "error", name: "BadTitle", inputs: [] },
  { type: "error", name: "BadLabel", inputs: [] },
  { type: "error", name: "NoSuchList", inputs: [] },
  { type: "error", name: "NoSuchWish", inputs: [] },
  { type: "error", name: "Closed", inputs: [] },
  { type: "error", name: "NotClosed", inputs: [] },
  { type: "error", name: "HostCannotGive", inputs: [] },
  { type: "error", name: "ZeroValue", inputs: [] },
  { type: "error", name: "NoteTooLong", inputs: [] },
  { type: "error", name: "WishFull", inputs: [] },
  {
    type: "error",
    name: "Overfunds",
    inputs: [{ name: "room", type: "uint128" }],
  },
  { type: "error", name: "OnlyHost", inputs: [] },
  { type: "error", name: "AlreadyClaimed", inputs: [] },
  { type: "error", name: "NotFunded", inputs: [] },
  { type: "error", name: "NotRefundable", inputs: [] },
  { type: "error", name: "NoSuchGift", inputs: [] },
  { type: "error", name: "AlreadyRefunded", inputs: [] },
  { type: "error", name: "NothingToWithdraw", inputs: [] },
  { type: "error", name: "TransferFailed", inputs: [] },
  { type: "error", name: "ReentrancyGuardReentrantCall", inputs: [] },
] as const;

export const contractAbi = hamperAbi;
