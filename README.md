# RobinX: Robinhood Chain MCP server

A **Robinhood Chain MCP server** for AI agents and trading bots: rug checks, deployer reputation, insider-flow detection, measured X callers and live call signals for **Robinhood Chain** (chain 4663) tokens, built from complete on-chain history. Gives any MCP agent (Claude Desktop, Cursor, …) a one-hop answer to *"who launched this token and should I trust it?"* — even seconds after launch, because it scores the deployer, not just the contract.

**Remote, no install:** add `https://api.robinx.io/mcp` as a custom connector in Claude, ChatGPT or any MCP client. **Local:** `npx -y robinx-mcp` (below).

RobinX measures who is actually right about Robinhood Chain — callers and deployers graded against real price since chain genesis.

Paid tools settle **$0.01–0.05 USDC per call on Base** via the x402 protocol. Configure a funded wallet key and the agent pays automatically; leave it out and paid tools return the price instead of data. All 28 tools are read-only (`readOnlyHint`) against the external RobinX API (`openWorldHint`).

## Tools

| Tool | Price | What it does |
|---|---|---|
| `robinx_stats` | free | Coverage stats: deployers scored, tokens indexed, insider-linked wallets flagged (discovery) |
| `robinx_search` | free | Resolve a `$SYMBOL` / name / address to ranked contract candidates + symbol-collision warning (fake-ticker scam screen) |
| `robinx_basket` | free | Live forward paper-basket — the lookahead-free public track record of the signal |
| `robinx_wallet` | free | Wallet reputation for any address: deployer record + insider-flow history (off-market supply, WETH realized) |
| `robinx_caller` | free | Caller Report Card: an X account's measured track record — early_rate, momentum_rate, median 1h forward return, cluster flag, recent calls (measured since chain genesis; calls preserved as captured) |
| `robinx_report` | $0.05 | The full token dossier in one call: verdict + deployer history + measured X callers + basket status + forensics. |
| `robinx_smart_holders` | $0.05 | Holders crossed with the chain-wide extraction/deployer index — strong signal, ambiguous direction, not a buy call |
| `robinx_entity` | $0.05 | A wallet's appearances across the accumulated holder-snapshot archive (balance then/now per token + identity) |
| `robinx_pulse` | $0.04 | Real-time X synthesis: narrative, sentiment, red flags, and proven early-caller activity (measured lift, not follower counts) |
| `robinx_structure` | $0.03 | Labeled holder-structure diff over ~24h: frozen/added/trimmed/exited wallets with identity + insider-linked labels, and a rotation/distribution/accumulation verdict. First GET queues a free scan (202, poll in ~15-60s) |
| `robinx_verdict` | $0.02 | Composite buy-risk verdict: deployer reputation + insider-distribution flags + activity → `trusted / mixed / avoid / serial_spammer / new_deployer` with reasons |
| `robinx_signals` | $0.02 | Pollable stream of fresh calls by measured early-callers (`since` cursor, `min_early_rate`, `limit`) — the event the call stream is built around |
| `robinx_deployer` | $0.01 | Deployer rap sheet: launched / real / dead counts, best-token volume, insider flag, 0-100 score |
| `robinx_token` | $0.01 | Token stats: swaps, WETH volume, unique traders, real-or-thin, linked deployer score |
| `robinx_feed` | $0.01 | Newest launches scored by deployer reputation — pollable (`min_score`, `since` cursor, `limit`) |
| `robinx_callers` | $0.01 | Proven X caller-lift leaderboard: who measurably moves price (median 1h forward return + early-rate) |
| `robinx_leaderboard` | $0.01 | Top trusted deployers: every wallet scoring >= 70, ranked — the watch-list of proven deployers with a graded record |
| `robinx_arc_launchpads` | $0.01 | Arc (chain 5042): every launchpad and factory since genesis, tokens that reached 100 and 1,000 transfers, launches in the last ~24 h and ~7 days |
| `robinx_arc_new_launches` | $0.02 | Newest Arc launches, each tied to its launchpad and the wallet that minted it |
| `robinx_arc_token` | $0.03 | One Arc token: launchpad, deployer record, first pool, transfers, other tokens using the same symbol |
| `robinx_arc_deployer` | $0.03 | One Arc wallet: every token it minted since genesis and the launchpads it used |

## Install — Claude Desktop

Add to `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`):

```json
{
  "mcpServers": {
    "robinx": {
      "command": "npx",
      "args": ["-y", "robinx-mcp"],
      "env": {
        "ROBINX_WALLET_KEY": "0xYOUR_FUNDED_BASE_USDC_WALLET_PRIVATE_KEY"
      }
    }
  }
}
```

## Install — Cursor

Add to `~/.cursor/mcp.json` (or a project `.cursor/mcp.json`) with the same `command`/`args`/`env` block.

## Config (env)

| var | required | default | purpose |
|---|---|---|---|
| `ROBINX_WALLET_KEY` | for paid tools | — | Private key of a funded Base wallet holding USDC. Without it, paid tools return the price and setup note instead of data. |
| `ROBINX_MAX_USD_PER_CALL` | no | `0.10` | Hard per-call spend ceiling; a requirement above this is refused. |
| `ROBINX_URL` | no | production | Override the API base URL. |

**Security:** the wallet key only ever touches this local MCP process; it is never sent to the API (x402 signs locally, the facilitator settles). Use a dedicated low-balance wallet.

## Without a wallet

Every paid tool still works as a price probe: it returns `PAYMENT REQUIRED ($0.0X USDC)` plus the x402 requirements, so an agent can decide whether to pay. The free tools (`robinx_stats`, `robinx_search`, `robinx_basket`, `robinx_wallet`, `robinx_caller`) always work, and `robinx_structure` still queues its free scan. The free version of the token report is the page `https://robinx.io/t/{token}`, or `GET https://api.robinx.io/report/{token}?tier=free` (25 a day per IP).

## Run locally (development)

```bash
npm install
ROBINX_WALLET_KEY=0x.. node server.js   # stdio server
```

API: `https://api.robinx.io` · x402 settlement proven on Base.
