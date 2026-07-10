// RobinX MCP tool definitions — one entry per API endpoint. Shared by the server
// so registration and the free/paid split live in one place.
// paid: true tools trigger x402 auto-pay (when a wallet key is configured); false = free.
export const BASE_URL = process.env.ROBINX_URL || process.env.HOODSCOPE_URL || 'https://api.robinx.io';
const FALLBACK_URL = 'https://hoodscope-api-production.up.railway.app';

// Pick a working base at startup: honor an explicit env override, else probe the
// branded URL and fall back to the origin if it isn't serving (DNS/cert in flux).
export async function resolveBaseUrl() {
  if (process.env.ROBINX_URL || process.env.HOODSCOPE_URL) return BASE_URL;
  try {
    const r = await fetch(BASE_URL + '/stats', { signal: AbortSignal.timeout(4000) });
    if (r.ok) return BASE_URL;
  } catch { /* fall through */ }
  return FALLBACK_URL;
}

export const TOOLS = [
  {
    name: 'robinx_verdict',
    paid: true,
    title: 'Robinhood Chain token verdict',
    description:
      'Composite BUY-RISK verdict for a Robinhood Chain (chain 4663) memecoin: combines the deployer\'s full-history reputation, insider-distribution flags, and on-chain activity into a single signal (trusted / mixed / avoid / serial_spammer / new_deployer) with plain-English reasons. Works even on a token that launched seconds ago, because it scores WHO deployed it. Costs $0.02 USDC on Base.',
    input: { token: { type: 'string', description: 'The token contract address (0x…) on Robinhood Chain' } },
    required: ['token'],
    path: (a) => `/verdict/${encodeURIComponent(a.token)}`,
  },
  {
    name: 'robinx_deployer',
    paid: true,
    title: 'Deployer reputation rap sheet',
    description:
      'Full reputation rap sheet for a deployer wallet on Robinhood Chain: how many tokens it launched, how many reached real activity vs. died, best-token volume, whether it does wallet-to-wallet insider distribution, and a 0-100 score. Costs $0.01 USDC on Base.',
    input: { address: { type: 'string', description: 'The deployer wallet address (0x…)' } },
    required: ['address'],
    path: (a) => `/deployer/${encodeURIComponent(a.address)}`,
  },
  {
    name: 'robinx_token',
    paid: true,
    title: 'Token on-chain stats',
    description:
      'On-chain activity for a Robinhood Chain token: swap count, WETH volume, unique traders, whether it crossed the real-activity threshold, and its deployer\'s score. Costs $0.01 USDC on Base.',
    input: { address: { type: 'string', description: 'The token contract address (0x…)' } },
    required: ['address'],
    path: (a) => `/token/${encodeURIComponent(a.address)}`,
  },
  {
    name: 'robinx_feed',
    paid: true,
    title: 'Live scored launch feed',
    description:
      'Poll the newest Robinhood Chain token launches, each auto-scored by its deployer\'s reputation (trusted / mixed / avoid / serial_spammer / new_deployer). Use min_score=70 to see ONLY launches from proven deployers (the high-signal alpha — ~1% of launches), since=<cursor from a prior call> to get only new launches, limit=N (max 100). Designed to be polled. Costs $0.01 USDC on Base.',
    input: {
      min_score: { type: 'string', description: 'Only return launches whose deployer scores >= this (e.g. "70" for proven deployers only). Optional.' },
      since: { type: 'string', description: 'Cursor from a previous call (ISO timestamp) — returns only launches newer than it. Optional.' },
      limit: { type: 'string', description: 'Max launches to return, 1-100 (default 25). Optional.' },
    },
    required: [],
    path: (a) => {
      const qs = new URLSearchParams();
      if (a.min_score) qs.set('min_score', a.min_score);
      if (a.since) qs.set('since', a.since);
      if (a.limit) qs.set('limit', a.limit);
      const s = qs.toString();
      return '/feed/new' + (s ? `?${s}` : '');
    },
  },
  {
    name: 'robinx_leaderboard',
    paid: true,
    title: 'Top trusted deployers',
    description: 'The highest-reputation deployers on Robinhood Chain (score ≥ 70), ranked. Costs $0.01 USDC on Base.',
    input: {},
    required: [],
    path: () => `/leaderboard`,
  },
  {
    name: 'robinx_stats',
    paid: false,
    title: 'RobinX coverage stats (free)',
    description: 'Free coverage stats for RobinX: how many deployers are scored, tokens indexed, real tokens, insider wallets flagged, and serial-spam factories detected on Robinhood Chain.',
    input: {},
    required: [],
    path: () => `/stats`,
  },
];
