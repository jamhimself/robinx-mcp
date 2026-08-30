// RobinX MCP tool definitions — one entry per API endpoint (24 tools, at parity with the
// hosted MCP at https://api.robinx.io/mcp as of 0.6.0). Shared by the server so
// registration and the free/paid split live in one place.
// KEEP IN SYNC: the hosted list lives in api/server.js MCP_TOOLS. They drifted apart once
// (npm 17 @ 0.4.0 vs hosted 22 @ 0.5.0, each missing tools the other had), which meant two
// catalogs disagreeing about what RobinX sells.
// paid: true tools trigger x402 auto-pay (when a wallet key is configured); false = free.
//
// ★ ONE DELIBERATE, DOCUMENTED EXCEPTION TO PARITY (2026-08-23): the hosted MCP carries
//   `robinx_identify` and this package does NOT. That is not drift — /identify is POST with a
//   base64 image BODY, and this client has no POST path: every tool here is dispatched as a GET
//   built from `path(args)`. Adding it would need request-body support in server.js plus an
//   image-shaped input schema. Until that exists, omitting it is correct and the divergence is
//   INTENTIONAL. Everything else must match, both directions.
//   ⚠ AND THE LESSON THAT UNCOVERED THIS: on 2026-08-23 both lists held 24 tools and were STILL
//   divergent — hosted had robinx_identify, npm had robinx_leaderboard. A parity check that
//   compares COUNTS hides a two-way swap. Compare the NAME SETS.
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
    name: 'robinx_stats',
    paid: false,
    title: 'RobinX coverage stats (free)',
    description:
      'Free coverage stats for RobinX: how many deployers are scored, tokens indexed, real tokens, wallets flagged insider-linked, and serial-spam factories detected on Robinhood Chain (chain 4663). Good first call to see what the index covers.',
    input: {},
    required: [],
    path: () => `/stats`,
  },
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
      'Full reputation rap sheet for a deployer wallet on Robinhood Chain: how many tokens it launched, how many reached real activity vs. died, best-token volume, whether it distributes tokens wallet-to-wallet (insider-prep pattern), and a 0-100 score. Costs $0.01 USDC on Base.',
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
    name: 'robinx_pulse',
    paid: true,
    title: 'X pulse synthesis',
    description:
      'Real-time X (Twitter) SYNTHESIS for a Robinhood Chain token: what the crowd is saying (narrative), sentiment, conviction (organic vs bot/shill), red flags, and — the differentiator — activity from PROVEN early-callers measured to precede price moves (not follower counts). Fuses live X with RobinX caller-lift and on-chain data; skeptical by design. Use when you need the social read on a token, not just the on-chain one. Costs $0.04 USDC on Base.',
    input: { token: { type: 'string', description: 'The token contract address (0x…) on Robinhood Chain' } },
    required: ['token'],
    path: (a) => `/pulse/${encodeURIComponent(a.token)}`,
  },
  {
    name: 'robinx_callers',
    paid: true,
    title: 'Proven caller leaderboard',
    description:
      'Proven X caller-lift leaderboard for Robinhood Chain: which accounts measurably move price — median 1h forward return after their calls, and early-rate (called BEFORE the run vs momentum-riding). Measured lift, not follower counts. Use it to decide whose calls are worth acting on. Costs $0.01 USDC on Base.',
    input: {},
    required: [],
    path: () => `/callers`,
  },
  {
    name: 'robinx_leaderboard',
    paid: true,
    title: 'Top trusted deployers',
    description:
      'The highest-reputation deployers on Robinhood Chain, ranked: every wallet whose full-history score is >= 70 (proven deployers), with launch counts and track record. The watch-list source — these are the wallets whose next launch is the high-signal event. Costs $0.01 USDC on Base.',
    input: {},
    required: [],
    path: () => '/leaderboard',
  },
  {
    name: 'robinx_basket',
    paid: false,
    title: 'Live paper-basket record (free)',
    description:
      'Free live forward paper-basket: every Robinhood Chain launch from a proven deployer, entered +30min after launch and held. The lookahead-free public track record of the RobinX signal — use it to judge whether the signal is worth paying for.',
    input: {},
    required: [],
    path: () => `/basket`,
  },
  {
    name: 'robinx_report',
    paid: true,
    title: 'Full token dossier',
    description:
      'The FULL token dossier in one call: composite verdict with reasons, deployer rap sheet + launch-by-launch history, token vitals, measured X callers (early-rate, median 1h lift, coordination flags), paper-basket status, and supply-forensics results if computed. The single best first call on any Robinhood Chain token. First 25 calls/day per IP are free; after that costs $0.05 USDC on Base.',
    input: { token: { type: 'string', description: 'The token contract address (0x…) on Robinhood Chain' } },
    required: ['token'],
    path: (a) => `/report/${encodeURIComponent(a.token)}`,
  },
  {
    name: 'robinx_wallet',
    paid: false,
    title: 'Wallet reputation (free)',
    description:
      'Free wallet reputation for ANY Robinhood Chain address: its deployer record (launched / real / dead counts + 0-100 score) AND its insider-flow history — whether it acquired token supply off-market, how much WETH it realized from that supply, and where it ranks among wallets flagged insider-linked. The "who is this wallet" call.',
    input: { address: { type: 'string', description: 'The wallet address (0x…) to look up' } },
    required: ['address'],
    path: (a) => `/wallet/${encodeURIComponent(a.address)}`,
  },
  {
    name: 'robinx_structure',
    paid: true,
    title: 'Holder structure diff',
    description:
      'Labeled holder-structure diff for a Robinhood Chain token: who FROZE (to the wei), who added, who trimmed, who exited over ~24h — every notable wallet stamped with what RobinX knows (insider-linked extraction record, deployer rap sheet, ENS + Farcaster identity with multi-wallet entities collapsed, round-number off-market allocation flags), plus a structure verdict: rotation vs top-distribution vs accumulation. The repricing-or-rug call that price data cannot make. The first GET auto-queues a free scan (HTTP 202 — poll again in ~15-60s); once computed, results cost $0.03 USDC on Base.',
    input: { token: { type: 'string', description: 'The token contract address (0x…) on Robinhood Chain' } },
    required: ['token'],
    path: (a) => `/structure/${encodeURIComponent(a.token)}`,
  },
  {
    name: 'robinx_search',
    paid: false,
    title: 'Token symbol search (free)',
    description:
      'Free token search by $symbol, name fragment, or address: resolves a ticker to its contract address(es) on Robinhood Chain, returns ranked candidates (real + liquid first), and flags symbol collisions — scammers deploy fake tickers of whatever is pumping, so screen a $symbol here before paying for a verdict or report on the wrong contract.',
    input: { q: { type: 'string', description: 'Ticker ($SYMBOL), name fragment, or 0x contract address' } },
    required: ['q'],
    path: (a) => `/search?q=${encodeURIComponent(a.q)}`,
  },
  {
    name: 'robinx_caller',
    paid: false,
    title: 'Caller Report Card (free)',
    description:
      'Free MEASURED track record for any X account that has called Robinhood Chain tokens: early_rate (share of calls placed BEFORE a run), momentum_rate (calls after the pump — exit-liquidity pattern), median 1h forward return, mutual-follow-cluster flag, and recent calls. Measured against real on-chain price since chain genesis; calls preserved as captured, so deletion does not scrub the record. Use before trusting any "alpha caller".',
    input: { handle: { type: 'string', description: 'X handle, with or without @' } },
    required: ['handle'],
    path: (a) => `/caller/${encodeURIComponent(String(a.handle || '').replace(/^@/, ''))}`,
  },
  {
    name: 'robinx_signals',
    paid: true,
    title: 'Fresh calls by measured early-callers',
    description:
      'Pollable stream of fresh Robinhood Chain calls by X accounts with a MEASURED early-call record (default: early_rate >= 0.5, >= 4 calls, coordinated clusters excluded). Each item carries the caller\'s full measured record + the token\'s deployer score and FDV. The highest-alpha event RobinX\'s corpus emits. Use since=<cursor from a prior call> to poll for only-new calls. Costs $0.02 USDC on Base.',
    input: {
      since: { type: 'string', description: 'captured_at cursor from a prior call — returns only calls newer than it. Optional.' },
      min_early_rate: { type: 'string', description: 'Only callers whose measured early_rate >= this (default 0.5). Optional.' },
      limit: { type: 'string', description: 'Max calls to return, 1-100 (default 25). Optional.' },
    },
    required: [],
    path: (a) => {
      const qs = new URLSearchParams();
      if (a.since) qs.set('since', a.since);
      if (a.min_early_rate) qs.set('min_early_rate', a.min_early_rate);
      if (a.limit) qs.set('limit', a.limit);
      const s = qs.toString();
      return '/signals/calls' + (s ? `?${s}` : '');
    },
  },
  {
    name: 'robinx_smart_holders',
    paid: true,
    title: 'Smart holders (extraction-index cross-ref)',
    description:
      'Wallets in this token\'s notable holder set that have a MEASURED record elsewhere on Robinhood Chain: off-market extraction history (with percentile rank among 4,000+ indexed wallets) and/or deployer track records, plus ENS/Farcaster identity. Strong signal, ambiguous direction — experienced wallets accumulating OR insider-linked wallets loading; not a buy call. Costs $0.05 USDC on Base.',
    input: { token: { type: 'string', description: 'The token contract address (0x…) on Robinhood Chain' } },
    required: ['token'],
    path: (a) => `/structure/${encodeURIComponent(a.token)}/smart-holders`,
  },
  {
    name: 'robinx_entity',
    paid: true,
    title: 'Wallet-entity appearances across tokens',
    description:
      'Follow a wallet across the accumulated holder-snapshot archive: every scanned token it appears in with balance then/now, plus ENS/Farcaster identity and insider-linked/deployer records. The archive is recorded live and cannot be rebuilt retroactively. Costs $0.05 USDC on Base.',
    input: { address: { type: 'string', description: 'The wallet address (0x…) to look up' } },
    required: ['address'],
    path: (a) => `/entity/${encodeURIComponent(a.address)}`,
  },
  // ---- 0.6.1: the first Telegram-sourced surface ----
  {
    name: 'robinx_tg_first_call',
    paid: true,
    title: 'Telegram vs X — which venue called this token first',
    description:
      'Cross-venue first sighting for one Robinhood Chain token: the first Telegram timestamp, the first X timestamp, and the lead in minutes (POSITIVE = Telegram carried it first, NEGATIVE = X did). Sourced from a private Telegram corpus plus the X mention archive — the Telegram side cannot be bought from any data vendor. Source rooms are NEVER identified and no message text is returned: you receive a count of how many rooms carried it. Every response carries corpus_through and corpus_stale so a stale answer is never mistaken for a fresh one. Corpus-wide the split is roughly 70/30 toward Telegram with a median 8-minute lead, but the distribution is BIMODAL — use the per-token number, never the average. An unseen token returns seen_on_telegram:false, a measured absence in our monitored set rather than evidence the token was never discussed. Costs $0.03 USDC on Base.',
    input: { token: { type: 'string', description: 'Robinhood Chain token address (0x + 40 hex)' } },
    required: ['token'],
    path: (a) => `/tg/first-call/${encodeURIComponent(a.token)}`,
  },
  // ---- 0.6.0: the agent-edge lineup (parity with the hosted MCP) ----
  {
    name: 'robinx_agent_features',
    paid: true,
    title: 'Agent feature row (token-level, one call)',
    description:
      'THE FEATURE ROW FOR A TRADING AGENT. One call returns the token-level feature row for a Robinhood Chain token, ready to fold into your own model: immutable launch facts (deployer, launch block, age); current activity (swaps, WETH volume, distinct traders, is_real and the exact block it crossed that threshold); the deployer\'s current track record; the latest price/FDV quote with its true observation time; and observed social measurements (exact mention counts, distinct accounts, first mention, 24h velocity, how many mentioning accounts are MEASURED callers with a track record, the best early-rate among them, and what share sit in a mutual-follow cluster — one correlated voice rather than independent confirmation). The response is split by epistemic status: current_state is recomputed in place and carries NO history, so joining it to a past timestamp is lookahead bias; observed sits on an immutable capture clock. Robinhood Chain only. RobinX publishes INPUTS, not predictions — no score of expected return, no recommendation, no financial advice; backtest them against your own forward returns. Costs $0.03 USDC on Base.',
    input: { token: { type: 'string', description: 'Robinhood Chain token address (0x + 40 hex)' } },
    required: ['token'],
    path: (a) => `/agent/features?token=${encodeURIComponent(a.token)}`,
  },
  {
    name: 'robinx_follows',
    paid: true,
    title: 'Principal follow tape',
    description:
      'Follow/unfollow transitions by the X accounts that matter on Robinhood Chain — the chain\'s principals and launchpad accounts — checked roughly every 6 hours and recorded as timestamped events. X exposes only CURRENT following state, so this history cannot be reconstructed after the fact. Every newly-followed handle is crossed with its MEASURED RobinX caller record. Pollable with since=<cursor>; filter by watched=<handle> or event=follow|unfollow. Edges that already existed when tracking began are marked baseline and never reported as dated follows. Costs $0.02 USDC on Base.',
    input: { watched: { type: 'string', description: 'filter to one watched principal handle' }, event: { type: 'string', description: 'follow | unfollow' }, since: { type: 'string', description: 'ISO cursor from a prior call' }, limit: { type: 'string', description: '1-100, default 50' } },
    path: (a) => { const q = new URLSearchParams(); if (a.watched) q.set('watched', String(a.watched).replace(/^@/, '')); if (a.event) q.set('event', a.event); if (a.since) q.set('since', a.since); if (a.limit) q.set('limit', a.limit); const s = q.toString(); return '/social/follows' + (s ? `?${s}` : ''); },
  },
  {
    name: 'robinx_followed_by',
    paid: false,
    title: 'Does a principal follow this handle? (free)',
    description:
      'Which watched Robinhood Chain principal accounts follow a given X handle, since when, and any observed follow/unfollow history. Edges that already existed when tracking began return status "already_following_when_tracking_began" with a NULL followed_at — RobinX never invents a follow date it did not witness. Free.',
    input: { handle: { type: 'string', description: 'X handle, with or without @' } },
    required: ['handle'],
    path: (a) => `/follows/${encodeURIComponent(String(a.handle).replace(/^@/, ''))}`,
  },
  {
    name: 'robinx_mentions',
    paid: true,
    title: 'Social tape for one token',
    description:
      'The mention tape for a Robinhood Chain token: recent mentions each carrying the account\'s MEASURED caller record, the true total (with a truncation flag), 24h velocity, the first-ever mention, and cluster-vs-independent voice counts. Never returns tweet text — RobinX sells measurement, not content. Costs $0.02 USDC on Base.',
    input: { token: { type: 'string', description: 'The token contract address (0x…) on Robinhood Chain' } },
    required: ['token'],
    path: (a) => `/mentions/${encodeURIComponent(a.token)}`,
  },
  {
    name: 'robinx_caller_calls',
    paid: true,
    title: 'One caller\'s receipts tape',
    description:
      'The most recent calls by one measured X account, each with the token\'s outcome and any cross-chain records — the full tape behind the free report card. An unknown handle returns a paid EMPTY tape rather than a 404, so you are never charged for a lookup that then errors. Costs $0.02 USDC on Base.',
    input: { handle: { type: 'string', description: 'X handle, with or without @' } },
    required: ['handle'],
    path: (a) => `/caller/${encodeURIComponent(String(a.handle).replace(/^@/, ''))}/calls`,
  },
  {
    name: 'robinx_social_momentum',
    paid: true,
    title: 'Tokens ranked by measured-caller weight',
    description:
      'Robinhood Chain tokens ranked by the MEASURED accuracy weight of the accounts mentioning them, then by distinct voices, then by raw mentions — mutual-follow clusters count once, not once per member. Window selectable with hours=1..48. Costs $0.02 USDC on Base.',
    input: { hours: { type: 'string', description: '1-48, default 24' } },
    path: (a) => `/social/momentum${a.hours ? `?hours=${encodeURIComponent(a.hours)}` : ''}`,
  },
];
