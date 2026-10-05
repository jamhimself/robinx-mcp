#!/usr/bin/env node
// RobinX MCP server (stdio). Exposes Robinhood Chain deployer-reputation, insider,
// and token-verdict tools to any MCP client (Claude Desktop, Cursor, …). Paid tools
// auto-pay their per-call USDC price on Base via x402 when ROBINX_WALLET_KEY is set.
//
// CRITICAL: stdio servers speak JSON-RPC on stdout — never write logs to stdout, only stderr.
import { readFileSync } from 'node:fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { TOOLS, resolveBaseUrl } from './tools.js';
import { callEndpoint, walletAddressHint } from './pay.js';

const log = (...a) => console.error('[robinx-mcp]', ...a); // stderr only
// the version a client sees is the published one (it read 0.6.0 through 0.6.1 and 0.6.2)
const PKG = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const BASE_URL = await resolveBaseUrl();
const server = new McpServer(
  { name: 'robinx', version: PKG.version },
  {
    instructions:
      'RobinX measures who is actually RIGHT about Robinhood Chain (4663): every X caller and every deployer graded against real on-chain price since chain genesis. Free: robinx_stats, robinx_basket, robinx_wallet, robinx_search (resolve a $symbol to an address — beware fake tickers), robinx_caller (an X account\'s measured track record — use before trusting any alpha caller). Best paid calls: robinx_signals (fresh calls by measured early-callers), robinx_report (the full dossier), robinx_smart_holders. Paid tools settle USDC on Base via x402 automatically when ROBINX_WALLET_KEY is a funded Base wallet; without it they return the price instead of data.',
  }
);

for (const t of TOOLS) {
  // Only the tool's `required` inputs are required (2026-10-02). Every input used to be a required string, so a client had
  // to fill since, limit and min_score to poll the launch feed at all (robinx_feed, robinx_signals, robinx_follows,
  // robinx_social_momentum and the two Arc lists); their path functions already treat an absent input as unset.
  const required = new Set(t.required || []);
  const inputSchema = {};
  for (const [k, spec] of Object.entries(t.input || {})) {
    const field = z.string().describe(spec.description || k);
    inputSchema[k] = required.has(k) ? field : field.optional();
  }
  server.registerTool(
    t.name,
    {
      title: t.title,
      description: t.description,
      ...(Object.keys(inputSchema).length ? { inputSchema } : {}),
      // Every tool is a pure read against the external RobinX API (paid ones spend
      // USDC via x402 but never mutate any RobinX state).
      annotations: { title: t.title, readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    },
    async (args) => {
      try {
        const url = BASE_URL + t.path(args || {});
        const r = await callEndpoint(url, t.paid);
        if (r.paymentRequired) {
          return { content: [{ type: 'text', text: `PAYMENT REQUIRED (${r.price || 'see body'}). ${r.note}\n\n${JSON.stringify(r.body, null, 2)}` }] };
        }
        if (!r.ok) {
          return { isError: true, content: [{ type: 'text', text: `RobinX error ${r.status}: ${JSON.stringify(r.body)}` }] };
        }
        const paidNote = r.paid_usd != null ? `\n\n(paid $${r.paid_usd} USDC)` : '';
        return { content: [{ type: 'text', text: JSON.stringify(r.body, null, 2) + paidNote }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: `RobinX call failed: ${e?.message || e}` }] };
      }
    }
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);
log(`ready — ${TOOLS.length} tools, wallet ${walletAddressHint()}, api ${BASE_URL}`);
