import { useState, type ReactNode } from 'react';
import { API_URL } from '../../services/api';
import { Card, CopyButton, PageHeader } from '../../components/ui';
import { cn } from '../../lib/utils';

type Lang = 'cURL' | 'JavaScript' | 'Python' | 'PHP';
const langs: Lang[] = ['cURL', 'JavaScript', 'Python', 'PHP'];
const BASE = `${API_URL}/api/v1`;

function Code({ children, lang }: { children: string; lang?: string }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-line bg-subtle">
      <div className="flex items-center justify-between border-b border-line px-3 py-1.5 text-[11px] uppercase tracking-wide text-muted">
        <span>{lang ?? 'code'}</span><CopyButton value={children} />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed"><code>{children}</code></pre>
    </div>
  );
}

function Tabs({ samples }: { samples: Record<Lang, string> }) {
  const [lang, setLang] = useState<Lang>('cURL');
  return (
    <div>
      <div className="mb-2 flex gap-1" role="tablist">
        {langs.map((l) => (
          <button key={l} role="tab" aria-selected={lang === l} onClick={() => setLang(l)}
            className={cn('rounded-md px-3 py-1 text-xs font-medium text-muted hover:bg-subtle', lang === l && 'bg-primary/10 text-primary')}>{l}</button>
        ))}
      </div>
      <Code lang={lang}>{samples[lang]}</Code>
    </div>
  );
}

const createSamples: Record<Lang, string> = {
  cURL: `curl -X POST ${BASE}/payments/create \\
  -H "Authorization: Bearer sk_live_xxxxx" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: create-ORDER123" \\
  -d '{
    "orderId": "ORDER123",
    "amount": 500
  }'`,
  JavaScript: `const res = await fetch("${BASE}/payments/create", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + process.env.SHREEPAY_KEY,
    "Content-Type": "application/json",
    "Idempotency-Key": "create-ORDER123",
  },
  body: JSON.stringify({ orderId: "ORDER123", amount: 500 }),
});
const { data } = await res.json();
console.log(data.paymentUrl);`,
  Python: `import os, requests

r = requests.post(
    "${BASE}/payments/create",
    headers={
        "Authorization": "Bearer " + os.environ["SHREEPAY_KEY"],
        "Idempotency-Key": "create-ORDER123",
    },
    json={"orderId": "ORDER123", "amount": 500},
    timeout=15,
)
print(r.json()["data"]["paymentUrl"])`,
  PHP: `<?php
$ch = curl_init("${BASE}/payments/create");
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    "Authorization: Bearer " . getenv("SHREEPAY_KEY"),
    "Content-Type: application/json",
    "Idempotency-Key: create-ORDER123",
  ],
  CURLOPT_POSTFIELDS => json_encode(["orderId" => "ORDER123", "amount" => 500]),
]);
$res = json_decode(curl_exec($ch), true);
echo $res["data"]["paymentUrl"];`,
};

const verifySamples: Record<Lang, string> = {
  cURL: `curl -X POST ${BASE}/payments/verify \\
  -H "Authorization: Bearer sk_live_xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "orderId": "ORDER123"
  }'`,
  JavaScript: `const res = await fetch("${BASE}/payments/verify", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + process.env.SHREEPAY_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ orderId: "ORDER123" }),
});
const { data } = await res.json();
if (data.status === "VERIFIED") { /* fulfil the order */ }`,
  Python: `r = requests.post(
    "${BASE}/payments/verify",
    headers={"Authorization": "Bearer " + os.environ["SHREEPAY_KEY"]},
    json={"orderId": "ORDER123"},
    timeout=20,
)
data = r.json()["data"]
if data["status"] == "VERIFIED":
    fulfil_order(data["orderId"])`,
  PHP: `<?php
$ch = curl_init("${BASE}/payments/verify");
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => ["Authorization: Bearer " . getenv("SHREEPAY_KEY"), "Content-Type: application/json"],
  CURLOPT_POSTFIELDS => json_encode(["orderId" => "ORDER123"]),
]);
$data = json_decode(curl_exec($ch), true)["data"];
if ($data["status"] === "VERIFIED") { /* fulfil the order */ }`,
};

const sections: { id: string; title: string; body: () => ReactNode }[] = [
  { id: 'introduction', title: 'Introduction', body: () => (
    <>
      <p>The ShreePay API lets your server create payment links and verify that customers have paid. Verification is performed by ShreePay against the payment provider; a payment is only credited to your balance after that check succeeds, and only once.</p>
      <p>Base URL: <code className="rounded bg-subtle px-1.5 py-0.5 font-mono text-xs">{BASE}</code></p>
      <p>All requests and responses are JSON. Amounts are in rupees (₹), up to 2 decimal places.</p>
      <Code lang="json">{`// success
{ "success": true, "data": { }, "message": "Success" }

// error
{ "success": false, "error": { "code": "INVALID_REQUEST", "message": "Invalid request" } }`}</Code>
    </>) },
  { id: 'authentication', title: 'Authentication', body: () => (
    <>
      <p>Send your secret key as a Bearer token. Create and revoke keys on the <b>API Keys</b> page. Keys are shown once, so store them in server-side environment variables, never in client code.</p>
      <Code lang="http">{`Authorization: Bearer sk_live_xxxxxxxxxxxxxxxxxxxxxxxxx`}</Code>
      <p>API keys can create and verify payments and read balances/transactions. Key management, profile changes and withdrawals are only available from the dashboard.</p>
      <p><b>Idempotency.</b> Send an <code className="font-mono text-xs">Idempotency-Key</code> header (8–128 chars) on <code className="font-mono text-xs">POST</code> requests. Repeating the same request returns the original response; reusing a key with a different body returns <code className="font-mono text-xs">422 IDEMPOTENCY_KEY_REUSED</code>.</p>
    </>) },
  { id: 'create-payment', title: 'Create Payment', body: () => (
    <>
      <p><code className="font-mono text-xs">POST /payments/create</code> · body: <code className="font-mono text-xs">orderId</code> (3–64 chars: letters, digits, _ -), <code className="font-mono text-xs">amount</code> (₹).</p>
      <Tabs samples={createSamples} />
      <Code lang="json">{`{
  "success": true,
  "data": {
    "orderId": "ORDER123",
    "amount": 500,
    "paymentUrl": "${API_URL}/pay/SP4F1C…",
    "status": "PENDING",
    "expiresAt": "2026-11-11T10:00:00.000Z"
  },
  "message": "Payment created"
}`}</Code>
      <p>Send <code className="font-mono text-xs">paymentUrl</code> to your customer. Re-sending the same <code className="font-mono text-xs">orderId</code> with the same amount returns the same link; a different amount returns <code className="font-mono text-xs">409 ORDER_EXISTS</code>.</p>
    </>) },
  { id: 'verify-payment', title: 'Verify Payment', body: () => (
    <>
      <p><code className="font-mono text-xs">POST /payments/verify</code> · body: <code className="font-mono text-xs">orderId</code>. Call it after the customer returns from the payment page (or poll until <code className="font-mono text-xs">VERIFIED</code>). Calling it repeatedly is safe: the balance is credited exactly once.</p>
      <Tabs samples={verifySamples} />
      <Code lang="json">{`{
  "success": true,
  "data": {
    "orderId": "ORDER123",
    "amount": 500,
    "status": "VERIFIED",
    "verified": true,
    "transaction": { "id": "…", "amount": 500, "status": "VERIFIED" }
  },
  "message": "Payment verified"
}`}</Code>
      <p>If the customer has not paid yet, <code className="font-mono text-xs">status</code> stays <code className="font-mono text-xs">PENDING</code> and <code className="font-mono text-xs">verified</code> is <code className="font-mono text-xs">false</code>. You can only verify orders created with your own keys; others return <code className="font-mono text-xs">403 ORDER_ACCESS_DENIED</code> or <code className="font-mono text-xs">404</code>.</p>
    </>) },
  { id: 'get-transaction', title: 'Get Transaction', body: () => (
    <>
      <p><code className="font-mono text-xs">GET /payments/:orderId</code> · <code className="font-mono text-xs">GET /payments</code> · <code className="font-mono text-xs">GET /transactions</code> · <code className="font-mono text-xs">GET /transactions/:id</code></p>
      <p>List endpoints accept <code className="font-mono text-xs">page</code>, <code className="font-mono text-xs">pageSize</code> (max 100), <code className="font-mono text-xs">q</code> (order ID search), <code className="font-mono text-xs">status</code>, <code className="font-mono text-xs">from</code>, <code className="font-mono text-xs">to</code>, <code className="font-mono text-xs">minAmount</code>, <code className="font-mono text-xs">maxAmount</code>.</p>
      <Code lang="bash">{`curl "${BASE}/payments/ORDER123" -H "Authorization: Bearer sk_live_xxxxx"`}</Code>
    </>) },
  { id: 'get-balance', title: 'Get Balance', body: () => (
    <>
      <p><code className="font-mono text-xs">GET /balance</code></p>
      <Code lang="json">{`{
  "success": true,
  "data": {
    "available": 700, "reserved": 0, "totalReceived": 1000, "totalWithdrawn": 300,
    "currency": "INR", "minWithdrawal": 100
  }
}`}</Code>
      <p>Balances are computed by ShreePay from an append-only ledger. They cannot be set or influenced by API callers.</p>
    </>) },
  { id: 'withdrawals', title: 'Withdrawals', body: () => (
    <>
      <p><code className="font-mono text-xs">GET /withdrawals</code> lists your requests (API key or dashboard). Requesting and cancelling (<code className="font-mono text-xs">POST /withdrawals</code>, <code className="font-mono text-xs">DELETE /withdrawals/:id</code>) require a dashboard login.</p>
      <p>Flow: <b>PENDING</b> → admin approves → <b>PROCESSING</b> → admin transfers manually and confirms → <b>PAID</b>. A rejected or cancelled request releases the reserved amount back to your balance. ShreePay never moves money automatically.</p>
    </>) },
  { id: 'api-keys', title: 'API Keys', body: () => (
    <>
      <p>Managed from the dashboard (<code className="font-mono text-xs">GET/POST /api-keys</code>, <code className="font-mono text-xs">DELETE /api-keys/:id</code> require a dashboard session). Only a hash of each key is stored; the full key is shown once at creation. Revoking a key takes effect immediately. <code className="font-mono text-xs">GET /api-usage</code> returns your request volume and latency.</p>
    </>) },
  { id: 'errors', title: 'Errors', body: () => (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[480px] text-left text-xs">
        <thead className="bg-subtle text-muted"><tr><th className="px-3 py-2">HTTP</th><th className="px-3 py-2">Code</th><th className="px-3 py-2">Meaning</th></tr></thead>
        <tbody className="divide-y divide-line">
          {[
            ['400', 'INVALID_REQUEST / INVALID_AMOUNT', 'Validation failed (unknown fields are rejected)'],
            ['401', 'INVALID_API_KEY / API_KEY_REVOKED', 'Missing, malformed, unknown or revoked key'],
            ['403', 'ORDER_ACCESS_DENIED / ACCOUNT_SUSPENDED', 'Not your order, or account suspended'],
            ['404', 'ORDER_NOT_FOUND', 'No such order for your account'],
            ['409', 'ORDER_EXISTS / AMOUNT_MISMATCH / DUPLICATE_TRANSACTION', 'State conflict; nothing was credited'],
            ['422', 'IDEMPOTENCY_KEY_REUSED', 'Key reused with a different request'],
            ['429', 'RATE_LIMITED', 'Slow down; see Rate Limits'],
            ['502', 'UPSTREAM_UNAVAILABLE', 'Payment service temporarily unavailable. Safe to retry'],
          ].map((r) => <tr key={r[1]}><td className="px-3 py-2 font-mono">{r[0]}</td><td className="px-3 py-2 font-mono">{r[1]}</td><td className="px-3 py-2 text-muted">{r[2]}</td></tr>)}
        </tbody>
      </table>
    </div>) },
  { id: 'rate-limits', title: 'Rate Limits', body: () => (
    <>
      <p>Limits apply per API key over a 60-second window. Defaults: <b>100 requests/min</b> overall and <b>30 requests/min</b> for <code className="font-mono text-xs">/payments/verify</code>. Exceeding a limit returns <code className="font-mono text-xs">429 RATE_LIMITED</code>; standard <code className="font-mono text-xs">RateLimit-*</code> headers show what remains. Back off and retry after the window resets.</p>
    </>) },
];

export default function Docs() {
  const [active, setActive] = useState(sections[0].id);
  return (
    <>
      <PageHeader title="API documentation" description="Everything you need to integrate ShreePay payments." />
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Documentation sections" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {sections.map((s) => (
              <li key={s.id} className="shrink-0">
                <a href={`#${s.id}`} onClick={() => setActive(s.id)}
                  className={cn('block rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-subtle hover:text-fg', active === s.id && 'bg-primary/10 font-medium text-primary')}>{s.title}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 space-y-6">
          {sections.map((s) => (
            <Card key={s.id} className="scroll-mt-24 p-5 sm:p-6">
              <h2 id={s.id} className="mb-3 text-lg font-semibold tracking-tight">{s.title}</h2>
              <div className="space-y-4 text-sm leading-relaxed text-fg/90">{s.body()}</div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
