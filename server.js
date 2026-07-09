#!/usr/bin/env node
// HoodScope MCP server (stdio). Exposes Robinhood Chain deployer-reputation, insider,
// and token-verdict tools to any MCP client (Claude Desktop, Cursor, …). Paid tools
// auto-pay their per-call USDC price on Base via x402 when HOODSCOPE_WALLET_KEY is set.
//
// CRITICAL: stdio servers speak JSON-RPC on stdout — never write logs to stdout, only stderr.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { TOOLS, BASE_URL } from './tools.js';
import { callEndpoint, walletAddressHint } from './pay.js';

const log = (...a) => console.error('[hoodscope-mcp]', ...a); // stderr only

const server = new McpServer({ name: 'hoodscope', version: '0.1.0' });

for (const t of TOOLS) {
  const inputSchema = {};
  for (const [k, spec] of Object.entries(t.input || {})) {
    inputSchema[k] = z.string().describe(spec.description || k);
  }
  server.registerTool(
    t.name,
    {
      title: t.title,
      description: t.description,
      ...(Object.keys(inputSchema).length ? { inputSchema } : {}),
    },
    async (args) => {
      try {
        const url = BASE_URL + t.path(args || {});
        const r = await callEndpoint(url, t.paid);
        if (r.paymentRequired) {
          return { content: [{ type: 'text', text: `PAYMENT REQUIRED (${r.price || 'see body'}). ${r.note}\n\n${JSON.stringify(r.body, null, 2)}` }] };
        }
        if (!r.ok) {
          return { isError: true, content: [{ type: 'text', text: `HoodScope error ${r.status}: ${JSON.stringify(r.body)}` }] };
        }
        const paidNote = r.paid_usd != null ? `\n\n(paid $${r.paid_usd} USDC)` : '';
        return { content: [{ type: 'text', text: JSON.stringify(r.body, null, 2) + paidNote }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: `HoodScope call failed: ${e?.message || e}` }] };
      }
    }
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);
log(`ready — ${TOOLS.length} tools, wallet ${walletAddressHint()}, api ${BASE_URL}`);
