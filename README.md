# RobinX MCP

Model Context Protocol server for **RobinX** — deployer reputation, insider detection, and token buy-risk verdicts for **Robinhood Chain** (chain 4663) memecoins, built from complete on-chain history. Gives any MCP agent (Claude Desktop, Cursor, …) a one-hop answer to *"who launched this token and should I trust it?"* — even seconds after launch, because it scores the deployer, not just the contract.

Paid tools settle **$0.01–0.02 USDC per call on Base** via the x402 protocol. Configure a funded wallet key and the agent pays automatically; leave it out and paid tools return the price instead of data.

## Tools

| Tool | Price | What it does |
|---|---|---|
| `robinx_verdict` | $0.02 | Composite buy-risk verdict: deployer reputation + insider-distribution flags + activity → `trusted / mixed / avoid / serial_spammer / new_deployer` with reasons |
| `robinx_deployer` | $0.01 | Deployer rap sheet: launched / real / dead counts, best-token volume, insider flag, 0-100 score |
| `robinx_token` | $0.01 | Token stats: swaps, WETH volume, unique traders, real-or-thin, linked deployer score |
| `robinx_leaderboard` | $0.01 | Top trusted deployers on the chain |
| `robinx_stats` | free | Coverage stats (discovery) |

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

Every paid tool still works as a price probe: it returns `PAYMENT REQUIRED ($0.0X USDC)` plus the x402 requirements, so an agent can decide whether to pay. The free `robinx_stats` tool always works.

## Run locally (development)

```bash
npm install
ROBINX_WALLET_KEY=0x... node server.js   # stdio server
```

API: `https://api.robinx.io` · x402 settlement proven on Base.
