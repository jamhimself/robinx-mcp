// x402 auto-pay for the HoodScope MCP server. If HOODSCOPE_WALLET_KEY is set, paid
// tools transparently pay their per-call USDC price on Base; otherwise the caller gets
// a clear "wallet not configured" message with the 402 details.
// Reuses the settlement-proven buyer pattern (wrapFetchWithPaymentFromConfig + ExactEvmScheme).
const BASE = 'eip155:8453';
const USDC_DECIMALS = 6;
const MAX_USD_PER_CALL = Number(process.env.HOODSCOPE_MAX_USD_PER_CALL || '0.10'); // hard per-call ceiling

let _wrappedFetch = null;
let _initErr = null;

async function getWrappedFetch() {
  if (_wrappedFetch || _initErr) return _wrappedFetch;
  const key = process.env.HOODSCOPE_WALLET_KEY;
  if (!key) { _initErr = 'no-key'; return null; }
  try {
    const { privateKeyToAccount } = await import('viem/accounts');
    const { wrapFetchWithPaymentFromConfig } = await import('@x402/fetch');
    const { ExactEvmScheme } = await import('@x402/evm');
    const account = privateKeyToAccount(key.startsWith('0x') ? key : `0x${key}`);
    const maxAtomic = BigInt(Math.round(MAX_USD_PER_CALL * 10 ** USDC_DECIMALS));
    const selector = (arg1, arg2) => {
      const reqs = arg2 !== undefined ? arg2 : arg1;
      const list = Array.isArray(reqs) ? reqs : [reqs];
      const pick = list.find((r) =>
        r.network === BASE &&
        BigInt(r.amount || r.maxAmountRequired || '0') <= maxAtomic &&
        /^0x[a-fA-F0-9]{40}$/.test(r.payTo || ''));
      if (!pick) throw new Error(`no Base-USDC requirement within $${MAX_USD_PER_CALL} cap`);
      return pick;
    };
    _wrappedFetch = wrapFetchWithPaymentFromConfig(fetch, {
      schemes: [{ network: BASE, client: new ExactEvmScheme(account) }],
      paymentRequirementsSelector: selector,
    });
    return _wrappedFetch;
  } catch (e) {
    _initErr = e?.message || String(e);
    return null;
  }
}

export function walletAddressHint() {
  return process.env.HOODSCOPE_WALLET_KEY ? 'configured' : 'not configured';
}

// GET a HoodScope endpoint. paid=false → plain fetch. paid=true → x402 auto-pay if a
// wallet is configured; else return a structured "payment required" note.
export async function callEndpoint(url, paid) {
  if (!paid) {
    const res = await fetch(url);
    return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) };
  }
  const wf = await getWrappedFetch();
  if (!wf) {
    // no wallet — fetch once to surface the 402 requirements so the agent/user knows the price
    const res = await fetch(url);
    let req = null; try { req = await res.json(); } catch {}
    return {
      ok: false, status: res.status, paymentRequired: true,
      note: _initErr === 'no-key'
        ? 'This is a paid HoodScope endpoint. Set HOODSCOPE_WALLET_KEY (a funded Base USDC wallet private key) in the MCP server env to enable auto-pay.'
        : `x402 wallet init failed: ${_initErr}`,
      price: req?.accepts?.[0]?.amount ? `${Number(req.accepts[0].amount) / 1e6} USDC` : undefined,
      body: req,
    };
  }
  const res = await wf(url, { method: 'GET' });
  const receipt = res.headers.get('PAYMENT-RESPONSE') || res.headers.get('X-PAYMENT-RESPONSE');
  let paid_amount;
  if (receipt) { try { paid_amount = Number(JSON.parse(Buffer.from(receipt, 'base64').toString()).amount) / 1e6; } catch {} }
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => null), paid_usd: paid_amount };
}
