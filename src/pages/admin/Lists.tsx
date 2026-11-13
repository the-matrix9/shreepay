import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Banknote, KeyRound, ReceiptText, ScrollText, Search, ShieldAlert } from 'lucide-react';
import { api, ApiError, type Page } from '../../services/api';
import type { ApiKeyRow, Tx, Withdrawal } from '../../types';
import { Button, Card, CardHeader, ConfirmModal, Field, Input, Modal, PageHeader, Select, StatusBadge, Skeleton } from '../../components/ui';
import { DataTable, Pagination, type Column } from '../../components/DataTable';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../lib/toast';
import { formatDateTime, formatINR } from '../../utils/format';
import type { ReactNode } from 'react';

/** Shared paginated list used by every admin table. */
function useAdminList<T>(path: string, extra: Record<string, string | undefined> = {}, pageSize = 20) {
  const [page, setPage] = useState(1);
  const key = JSON.stringify(extra);
  useEffect(() => setPage(1), [key]);
  const query = { page, pageSize, ...extra };
  const q = useQuery({ queryKey: ['admin', path, query], queryFn: () => api<Page<T>>(path, { query }), placeholderData: (p) => p });
  return { ...q, page, setPage };
}

function ListCard<T>({ list, columns, rowKey, empty, toolbar }: {
  list: ReturnType<typeof useAdminList<T>>; columns: Column<T>[]; rowKey: (r: T) => string;
  empty: { title: string; description?: string; icon?: ReactNode }; toolbar?: ReactNode;
}) {
  return (
    <Card>
      {toolbar && <div className="flex flex-wrap gap-3 border-b border-line p-4">{toolbar}</div>}
      <DataTable rowKey={rowKey} rows={list.data?.items} loading={list.isLoading} columns={columns} empty={empty} />
      {list.data && <Pagination page={list.page} pageSize={list.data.pageSize} total={list.data.total} onPage={list.setPage} />}
    </Card>
  );
}

/* ---------------- Payments ---------------- */
export function AdminPayments() {
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const list = useAdminList<Tx>('/admin/transactions', { q: dq || undefined });
  return (
    <>
      <PageHeader title="Payments" description="Every verified transaction across all merchants." />
      <ListCard list={list} rowKey={(r) => r.id} empty={{ icon: <ReceiptText className="h-5 w-5" />, title: 'No transactions' }}
        toolbar={<div className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input aria-label="Search by order ID" placeholder="Search order ID…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} maxLength={64} /></div>}
        columns={[
          { header: 'Order ID', cell: (r) => <span className="font-mono text-xs">{r.orderId}</span> },
          { header: 'Merchant', cell: (r) => <div><p className="text-sm">{r.merchant}</p><p className="text-xs text-muted">{r.merchantEmail}</p></div>, hideOnMobile: true },
          { header: 'Amount', cell: (r) => <span className="num font-medium">{formatINR(r.amount)}</span> },
          { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
          { header: 'Reference', cell: (r) => <span className="font-mono text-xs">{r.externalTransactionId ?? '—'}</span>, hideOnMobile: true },
          { header: 'Verified', cell: (r) => formatDateTime(r.verifiedAt), hideOnMobile: true },
        ]} />
    </>
  );
}

/* ---------------- Withdrawals ---------------- */
type WAction = 'approve' | 'reject' | 'mark-paid';

export function AdminWithdrawals() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState('PENDING');
  const [sel, setSel] = useState<{ w: Withdrawal; action: WAction } | null>(null);
  const [note, setNote] = useState('');
  const list = useAdminList<Withdrawal>('/admin/withdrawals', { status: status || undefined });

  const run = useMutation({
    mutationFn: ({ w, action }: { w: Withdrawal; action: WAction }) =>
      api(`/admin/withdrawals/${w.id}/${action}`, { method: 'POST', body: action === 'mark-paid' ? { confirm: true, note: note || undefined } : action === 'reject' ? { note } : { note: note || undefined } }),
    onSuccess: (_d, v) => {
      toast('success', v.action === 'approve' ? 'Approved: now PROCESSING' : v.action === 'reject' ? 'Rejected and balance released' : 'Marked as PAID');
      setSel(null); setNote(''); qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => { toast('error', e instanceof ApiError ? e.message : 'Action failed'); setSel(null); qc.invalidateQueries({ queryKey: ['admin'] }); },
  });
  const close = () => { setSel(null); setNote(''); };

  const w = sel?.w;
  return (
    <>
      <PageHeader title="Withdrawals" description="Review requests, transfer the money manually, then confirm it as paid." />
      <ListCard list={list} rowKey={(r) => r.id} empty={{ icon: <Banknote className="h-5 w-5" />, title: status ? `No ${status.toLowerCase()} withdrawals` : 'No withdrawals' }}
        toolbar={<Select aria-label="Status" className="w-44" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{['PENDING', 'PROCESSING', 'PAID', 'REJECTED', 'CANCELLED'].map((s) => <option key={s}>{s}</option>)}</Select>}
        columns={[
          { header: 'Merchant', cell: (r) => <div><p className="font-medium">{r.merchant}</p><p className="text-xs text-muted">{r.merchantEmail}</p></div> },
          { header: 'Amount', cell: (r) => <span className="num font-semibold">{formatINR(r.amount)}</span> },
          { header: 'UPI', cell: (r) => <span className="font-mono text-xs">{r.upiId}</span> },
          { header: 'Requested', cell: (r) => formatDateTime(r.requestedAt), hideOnMobile: true },
          { header: 'Status', cell: (r) => <div><StatusBadge status={r.status} />{r.adminNote && <p className="mt-1 max-w-[200px] truncate text-xs text-muted" title={r.adminNote}>{r.adminNote}</p>}</div> },
          { header: 'Actions', cell: (r) => (
            <div className="flex flex-wrap gap-1.5">
              {r.status === 'PENDING' && <><Button size="sm" onClick={() => setSel({ w: r, action: 'approve' })}>Approve</Button><Button size="sm" variant="secondary" className="text-danger" onClick={() => setSel({ w: r, action: 'reject' })}>Reject</Button></>}
              {r.status === 'PROCESSING' && <><Button size="sm" onClick={() => setSel({ w: r, action: 'mark-paid' })}>Mark as paid</Button><Button size="sm" variant="secondary" className="text-danger" onClick={() => setSel({ w: r, action: 'reject' })}>Reject</Button></>}
            </div>) },
        ]} />

      <ConfirmModal open={sel?.action === 'approve'} onClose={close} loading={run.isPending} title="Approve withdrawal"
        confirmLabel="Approve" onConfirm={() => sel && run.mutate(sel)}
        message={<div className="space-y-3"><p>Approve <b className="text-fg">{w && formatINR(w.amount)}</b> for <b className="text-fg">{w?.merchant}</b>? It moves to PROCESSING; you then transfer the money manually and mark it paid.</p>
          <Field label="Note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></Field></div>} />

      <ConfirmModal open={sel?.action === 'reject'} onClose={close} loading={run.isPending} danger title="Reject withdrawal"
        confirmLabel="Reject & release" onConfirm={() => note.trim().length >= 3 && sel && run.mutate(sel)}
        message={<div className="space-y-3"><p>The reserved <b className="text-fg">{w && formatINR(w.amount)}</b> returns to {w?.merchant}'s available balance. The merchant will see your reason.</p>
          <Field label="Reason (required)" error={note.length > 0 && note.trim().length < 3 ? 'At least 3 characters' : undefined}><Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></Field></div>} />

      <Modal open={sel?.action === 'mark-paid'} onClose={close} title="Mark as paid"
        footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button loading={run.isPending} onClick={() => sel && run.mutate(sel)}>Yes, I transferred it</Button></>}>
        <div className="space-y-3 text-sm">
          <p className="rounded-lg bg-warning/10 p-3 font-medium text-warning" data-testid="paid-confirm">Confirm that {w && formatINR(w.amount)} has been manually transferred to {w?.upiId}.</p>
          <p className="text-muted">ShreePay does not send money. This records that <em>you</em> did, moves the amount from reserved to withdrawn, and cannot be undone.</p>
          <Field label="Transfer reference / note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="UTR or bank reference" /></Field>
        </div>
      </Modal>
    </>
  );
}

/* ---------------- API keys ---------------- */
export function AdminApiKeys() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [target, setTarget] = useState<ApiKeyRow | null>(null);
  const list = useAdminList<ApiKeyRow>('/admin/api-keys');
  const revoke = useMutation({
    mutationFn: (id: string) => api(`/admin/api-keys/${id}/revoke`, { method: 'POST' }),
    onSuccess: () => { toast('success', 'API key revoked'); setTarget(null); qc.invalidateQueries({ queryKey: ['admin'] }); },
    onError: (e) => { setTarget(null); toast('error', e instanceof ApiError ? e.message : 'Could not revoke'); },
  });
  return (
    <>
      <PageHeader title="API keys" description="Keys are stored as hashes; only prefixes are visible." />
      <ListCard list={list} rowKey={(r) => r.id} empty={{ icon: <KeyRound className="h-5 w-5" />, title: 'No API keys' }}
        columns={[
          { header: 'Merchant', cell: (r) => <div><p>{r.merchant}</p><p className="text-xs text-muted">{r.merchantEmail}</p></div> },
          { header: 'Name', cell: (r) => r.name, hideOnMobile: true },
          { header: 'Prefix', cell: (r) => <span className="font-mono text-xs">{r.prefix}…</span> },
          { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
          { header: 'Last used', cell: (r) => (r.lastUsedAt ? formatDateTime(r.lastUsedAt) : 'Never'), hideOnMobile: true },
          { header: '', cell: (r) => r.status === 'ACTIVE' ? <Button size="sm" variant="ghost" className="text-danger" onClick={() => setTarget(r)}>Revoke</Button> : null },
        ]} />
      <ConfirmModal open={!!target} onClose={() => setTarget(null)} loading={revoke.isPending} danger title="Revoke API key?" confirmLabel="Revoke"
        onConfirm={() => target && revoke.mutate(target.id)} message={<>Revoke <b className="font-mono text-fg">{target?.prefix}…</b> belonging to {target?.merchant}? Their integration will stop immediately.</>} />
    </>
  );
}

/* ---------------- Security / API logs / Audit logs ---------------- */
export function AdminSecurity() {
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const list = useAdminList<{ id: string; eventType: string; userEmail: string | null; metadata: unknown; createdAt: string }>('/admin/security-events', { q: dq || undefined });
  return (
    <>
      <PageHeader title="Security events" description="Logins, lockouts, denied access, key activity and anomalies." />
      <ListCard list={list} rowKey={(r) => r.id} empty={{ icon: <ShieldAlert className="h-5 w-5" />, title: 'No events' }}
        toolbar={<Input aria-label="Filter by event type" placeholder="Filter event type, e.g. LOGIN_FAILED" className="max-w-sm" value={q} onChange={(e) => setQ(e.target.value)} maxLength={40} />}
        columns={[
          { header: 'Event', cell: (r) => <span className="font-mono text-xs font-medium">{r.eventType}</span> },
          { header: 'User', cell: (r) => r.userEmail ?? <span className="text-muted">anonymous</span> },
          { header: 'Details', cell: (r) => <span className="block max-w-[320px] truncate font-mono text-xs text-muted" title={JSON.stringify(r.metadata)}>{r.metadata ? JSON.stringify(r.metadata) : '—'}</span>, hideOnMobile: true },
          { header: 'When', cell: (r) => formatDateTime(r.createdAt) },
        ]} />
    </>
  );
}

export function AdminApiLogs() {
  const list = useAdminList<{ id: string; merchantEmail: string | null; keyPrefix: string | null; method: string; endpoint: string; statusCode: number; responseTime: number; createdAt: string }>('/admin/api-logs');
  return (
    <>
      <PageHeader title="API logs" description="Authenticated API traffic. IPs are stored hashed; keys are never logged." />
      <ListCard list={list} rowKey={(r) => r.id} empty={{ icon: <Activity className="h-5 w-5" />, title: 'No API traffic yet' }}
        columns={[
          { header: 'Request', cell: (r) => <span className="font-mono text-xs"><b>{r.method}</b> {r.endpoint}</span> },
          { header: 'Status', cell: (r) => <span className={r.statusCode >= 400 ? 'num font-medium text-danger' : 'num font-medium text-success'}>{r.statusCode}</span> },
          { header: 'Merchant', cell: (r) => <span className="text-xs">{r.merchantEmail ?? '—'}</span>, hideOnMobile: true },
          { header: 'Key', cell: (r) => <span className="font-mono text-xs">{r.keyPrefix ? r.keyPrefix + '…' : 'session'}</span>, hideOnMobile: true },
          { header: 'Latency', cell: (r) => <span className="num">{r.responseTime} ms</span>, hideOnMobile: true },
          { header: 'When', cell: (r) => formatDateTime(r.createdAt) },
        ]} />
    </>
  );
}

export function AdminAuditLogs() {
  const list = useAdminList<{ id: string; action: string; admin: string; target: string | null; metadata: unknown; createdAt: string }>('/admin/audit-logs');
  return (
    <>
      <PageHeader title="Audit logs" description="Every admin action, recorded with the withdrawal or merchant it touched." />
      <ListCard list={list} rowKey={(r) => r.id} empty={{ icon: <ScrollText className="h-5 w-5" />, title: 'No admin actions yet' }}
        columns={[
          { header: 'Action', cell: (r) => <span className="font-mono text-xs font-medium">{r.action}</span> },
          { header: 'Admin', cell: (r) => <span className="text-xs">{r.admin}</span> },
          { header: 'Merchant', cell: (r) => <span className="text-xs">{r.target ?? '—'}</span>, hideOnMobile: true },
          { header: 'Details', cell: (r) => <span className="block max-w-[320px] truncate font-mono text-xs text-muted" title={JSON.stringify(r.metadata)}>{r.metadata ? JSON.stringify(r.metadata) : '—'}</span>, hideOnMobile: true },
          { header: 'When', cell: (r) => formatDateTime(r.createdAt) },
        ]} />
    </>
  );
}

/* ---------------- Settings ---------------- */
export function AdminSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const s = useQuery({ queryKey: ['admin', 'settings'], queryFn: () => api<{ min_withdrawal: number; registrations_open: boolean }>('/admin/settings') });
  const [min, setMin] = useState('');
  useEffect(() => { if (s.data) setMin(String(s.data.min_withdrawal)); }, [s.data]);
  const save = useMutation({
    mutationFn: (b: object) => api('/admin/settings', { method: 'PUT', body: b }),
    onSuccess: () => { toast('success', 'Settings updated'); qc.invalidateQueries({ queryKey: ['admin', 'settings'] }); },
    onError: (e) => toast('error', e instanceof ApiError ? e.message : 'Could not save'),
  });
  const valid = /^\d{1,7}$/.test(min) && Number(min) >= 1;
  return (
    <>
      <PageHeader title="Platform settings" description="Changes apply immediately and are audit-logged." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Withdrawals" />
          {s.isLoading ? <div className="p-5"><Skeleton className="h-16 w-full" /></div> : (
            <form className="space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); if (valid) save.mutate({ min_withdrawal: Number(min) }); }}>
              <Field label="Minimum withdrawal (₹)" error={min && !valid ? 'Enter a whole number ≥ 1' : undefined}><Input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} invalid={!!min && !valid} /></Field>
              <Button type="submit" loading={save.isPending} disabled={!valid || Number(min) === s.data?.min_withdrawal}>Save</Button>
            </form>
          )}
        </Card>
        <Card>
          <CardHeader title="Registrations" />
          <div className="flex items-center justify-between gap-4 p-5">
            <div><p className="text-sm font-medium">Allow new merchant sign-ups</p><p className="text-xs text-muted">Turn off to close public registration.</p></div>
            <Button variant={s.data?.registrations_open ? 'secondary' : 'primary'} loading={save.isPending} disabled={!s.data}
              onClick={() => s.data && save.mutate({ registrations_open: !s.data.registrations_open })}>{s.data?.registrations_open ? 'Open: click to close' : 'Closed: click to open'}</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
