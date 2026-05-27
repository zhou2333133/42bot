// Minimal ABI fragments transcribed from the official 42 contracts source and ERC20/ERC6909 interfaces.
// Phase 3 still requires generated or BscScan-verified ABI before live execution is allowed.
export const ftLensV2Abi = [
  {
    type: "function",
    name: "simulateMint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "market", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "isExactIn", type: "bool" },
      { name: "dataSwap", type: "bytes" },
      { name: "dataGuess", type: "bytes" },
      { name: "integratorFeeBps", type: "uint256" }
    ],
    outputs: [
      {
        name: "pre",
        type: "tuple",
        components: [
          { name: "tokenId", type: "uint256" },
          { name: "price", type: "uint256" },
          { name: "supply", type: "uint256" },
          { name: "totalMarketCap", type: "uint256" },
          { name: "payoutPerOt", type: "uint256" }
        ]
      },
      {
        name: "post",
        type: "tuple",
        components: [
          { name: "tokenId", type: "uint256" },
          { name: "price", type: "uint256" },
          { name: "supply", type: "uint256" },
          { name: "totalMarketCap", type: "uint256" },
          { name: "payoutPerOt", type: "uint256" }
        ]
      },
      {
        name: "quote",
        type: "tuple",
        components: [
          { name: "collateralFromUser", type: "uint256" },
          { name: "collateralToTreasury", type: "uint256" },
          { name: "collateralToIntegrator", type: "uint256" },
          { name: "otToUser", type: "uint256" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "simulateRedeem",
    stateMutability: "nonpayable",
    inputs: [
      { name: "market", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "isExactIn", type: "bool" },
      { name: "dataSwap", type: "bytes" },
      { name: "dataGuess", type: "bytes" },
      { name: "integratorFeeBps", type: "uint256" }
    ],
    outputs: [
      {
        name: "pre",
        type: "tuple",
        components: [
          { name: "tokenId", type: "uint256" },
          { name: "price", type: "uint256" },
          { name: "supply", type: "uint256" },
          { name: "totalMarketCap", type: "uint256" },
          { name: "payoutPerOt", type: "uint256" }
        ]
      },
      {
        name: "post",
        type: "tuple",
        components: [
          { name: "tokenId", type: "uint256" },
          { name: "price", type: "uint256" },
          { name: "supply", type: "uint256" },
          { name: "totalMarketCap", type: "uint256" },
          { name: "payoutPerOt", type: "uint256" }
        ]
      },
      {
        name: "quote",
        type: "tuple",
        components: [
          { name: "collateralToUser", type: "uint256" },
          { name: "collateralToTreasury", type: "uint256" },
          { name: "collateralToIntegrator", type: "uint256" },
          { name: "otFromUser", type: "uint256" },
          { name: "collateralMintValue", type: "uint256" }
        ]
      }
    ]
  }
] as const;

export const ftRouterV2Abi = [
  {
    type: "function",
    name: "swapMarketV2",
    stateMutability: "nonpayable",
    inputs: [
      { name: "market", type: "address" },
      { name: "receiver", type: "address" },
      { name: "tokenId", type: "uint256" },
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "isMint", type: "bool" },
          { name: "amount", type: "uint256" },
          { name: "isExactIn", type: "bool" },
          { name: "minOutOrMaxIn", type: "uint256" }
        ]
      },
      { name: "dataSwap", type: "bytes" },
      { name: "dataGuess", type: "bytes" },
      { name: "integrator", type: "address" },
      { name: "integratorFeeBps", type: "uint256" }
    ],
    outputs: []
  }
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  }
] as const;

export const erc6909Abi = [
  {
    type: "function",
    name: "isOperator",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "setOperator",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "approved", type: "bool" }
    ],
    outputs: [{ name: "", type: "bool" }]
  }
] as const;
