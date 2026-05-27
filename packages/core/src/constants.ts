export const BNB_CHAIN_ID = 56;

export const BUSDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";

export const FORTYTWO_REST_BASE = "https://rest.ft.42.space";

export const CONTRACT_CANDIDATES = {
  deprecatedRouter: "0x88888888338e60bfB4657187169cFFa5c8640E42",
  routerProxy: "0x888888886619275d33c00D3BC62DF94D700DCD42",
  deprecatedController: "0xF21b2D4F8989b27f732e369907F25f0E8D95Fe62",
  controllerV2Proxy: "0x8Fe93361D2B8b9519C4d20d47a319288Feec9072",
  powerCurve: "0x0443E04e70E4285a6cA73eacaC5267f3B4cBb7Da",
  powerLdaCurve: "0xa59096C20022a9ec5d7691E0DcDc7D46776b1b3d",
  clockCurve: "0x495B31876c092c236d1b0Df5Cc953D45d41301F1",
  lensV2: "0x4AAd5A856941FB64df10362024e3Ece24023d4d1"
} as const;

export const OFFICIAL_DOCS = {
  deployments: "https://docs.42.space/for-developers/deployments.md",
  getAllMarkets: "https://docs.42.space/for-developers/rest-api-alpha/markets/get-all-markets.md",
  getCurrentPrices: "https://docs.42.space/for-developers/rest-api-alpha/markets/get-current-outcome-token-prices.md",
  getActivity: "https://docs.42.space/for-developers/rest-api-alpha/users/get-user-activity-feed.md"
} as const;
