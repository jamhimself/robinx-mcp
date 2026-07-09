// HoodScope MCP tool definitions — one entry per API endpoint. Shared by the server
// so registration and the free/paid split live in one place.
// paid: true tools trigger x402 auto-pay (when a wallet key is configured); false = free.
export const BASE_URL = process.env.HOODSCOPE_URL || 'https://hoodscope-api-production.up.railway.app';

export const TOOLS = [
  {
    name: 'hoodscope_verdict',
    paid: true,
    title: 'Robinhood Chain token verdict',
    description:
      'Composite BUY-RISK verdict for a Robinhood Chain (chain 4663) memecoin: combines the deployer\'s full-history reputation, insider-distribution flags, and on-chain activity into a single signal (trusted / mixed / avoid / serial_spammer / new_deployer) with plain-English reasons. Works even on a token that launched seconds ago, because it scores WHO deployed it. Costs $0.02 USDC on Base.',
    input: { token: { type: 'string', description: 'The token contract address (0x…) on Robinhood Chain' } },
    required: ['token'],
    path: (a) => `/verdict/${encodeURIComponent(a.token)}`,
  },
  {
    name: 'hoodscope_deployer',
    paid: true,
    title: 'Deployer reputation rap sheet',
    description:
      'Full reputation rap sheet for a deployer wallet on Robinhood Chain: how many tokens it launched, how many reached real activity vs. died, best-token volume, whether it does wallet-to-wallet insider distribution, and a 0-100 score. Costs $0.01 USDC on Base.',
    input: { address: { type: 'string', description: 'The deployer wallet address (0x…)' } },
    required: ['address'],
    path: (a) => `/deployer/${encodeURIComponent(a.address)}`,
  },
  {
    name: 'hoodscope_token',
    paid: true,
    title: 'Token on-chain stats',
    description:
      'On-chain activity for a Robinhood Chain token: swap count, WETH volume, unique traders, whether it crossed the real-activity threshold, and its deployer\'s score. Costs $0.01 USDC on Base.',
    input: { address: { type: 'string', description: 'The token contract address (0x…)' } },
    required: ['address'],
    path: (a) => `/token/${encodeURIComponent(a.address)}`,
  },
  {
    name: 'hoodscope_leaderboard',
    paid: true,
    title: 'Top trusted deployers',
    description: 'The highest-reputation deployers on Robinhood Chain (score ≥ 70), ranked. Costs $0.01 USDC on Base.',
    input: {},
    required: [],
    path: () => `/leaderboard`,
  },
  {
    name: 'hoodscope_stats',
    paid: false,
    title: 'HoodScope coverage stats (free)',
    description: 'Free coverage stats for HoodScope: how many deployers are scored, tokens indexed, real tokens, insider wallets flagged, and serial-spam factories detected on Robinhood Chain.',
    input: {},
    required: [],
    path: () => `/stats`,
  },
];
