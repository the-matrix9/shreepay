import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Search, Users } from 'lucide-react';
import { api, ApiError, type Page } from '../../services/api';
import type { ApiKeyRow, Tx, Withdrawal } from '../../types';
import { Button, Card, CardHeader, ConfirmModal, Input, PageHeader, Select, StatusBadge, Skeleton } from '../../components/ui';
import { DataTable, Pagination } from '../../components/DataTable';
import { StatCard } from '../../components/StatCard';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../lib/toast';
import { formatDate, formatDateTime, formatINR } from '../../utils/format';

interface Bal { available: number; reserved: number; totalReceived: number; totalWithdrawn: number }
interface MerchantRow { id: string; name: string; email: string; status: string; businessName?: string; upiId: string | null; balance: Bal; transactions: number; createdAt: string }

function useStatusAction() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'suspend' | 'activate' }) => api(`/admin/merchants/${id}/${action}`, { method: 'POST' }),
    onSuccess: (_d, v) => { toast('success', v.action === 'suspend' ? 'Merchant suspended' : 'Merchant activated'); qc.invalidateQueries({ queryKey: ['admin'] }); },
    onError: (e) => toast('error', e instanceof ApiError ? e.message : 'Action failed'),
  });
}

export default function AdminMerchants() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<{ m: MerchantRow; action: 'suspend' | 'activate' } | null>(null);
  const dq = useDebounce(q);
  useEffect(() => setPage(1), [dq, status]);
  const query = { page, pageSize: 15, q: dq || undefined, status: status || undefined };
  const list = useQuery({ queryKey: ['admin', 'merchants', query], queryFn: () => api<Page<MerchantRow>>('/admin/merchants', { query }), placeholderData: (p) => p });
  const act = useStatusAction();

  return (
    <>
      <PageHeader title="Merchants" description="Everyone who can create payments on ShreePay." />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-line p-4">
          <div className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input aria-label="Search merchants" placeholder="Search name, email or business…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} maxLength={64} /></div>
          <Select aria-label="Status" className="w-40" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option>ACTIVE</option><option>SUSPENDED</option></Select>
        </div>
        <DataTable rowKey={(r) => r.id} rows={list.data?.items} loading={list.isLoading}
          empty={{ icon: <Users className="h-5 w-5" />, title: 'No merchants found' }}
          columns={[
            { header: 'Merchant', cell: (r) => <span className="font-medium">{r.name}</span> },
            { header: 'Email', cell: (r) => <span className="text-xs">{r.email}</span>, hideOnMobile: true },
            { header: 'Business', cell: (r) => r.businessName ?? '—', hideOnMobile: true },
            { header: 'Balance', cell: (r) => <span className="num">{formatINR(r.balance.available)}</span> },
            { header: 'Txns', cell: (r) => <span className="num">{r.transactions}</span>, hideOnMobile: true },
            { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
            { header: 'Joined', cell: (r) => formatDate(r.createdAt), hideOnMobile: true },
            { header: 'Actions', cell: (r) => (
              <div className="flex gap-1.5">
                <Link to={`/admin/merchants/${r.id}`}><Button size="sm" variant="secondary">View</Button></Link>
                {r.status === 'ACTIVE' ? <Button size="sm" variant="ghost" className="text-danger" onClick={() => setTarget({ m: r, action: 'suspend' })}>Suspend</Button>
                  : <Button size="sm" variant="ghost" onClick={() => setTarget({ m: r, action: 'activate' })}>Activate</Button>}
              </div>) },
          ]} />
        {list.data && <Pagination page={page} pageSize={list.data.pageSize} total={list.data.total} onPage={setPage} />}
      </Card>
      <ConfirmModal open={!!target} onClose={() => setTarget(null)} loading={act.isPending} danger={target?.action === 'suspend'}
        title={target?.action === 'suspend' ? 'Suspend merchant?' : 'Activate merchant?'} confirmLabel={target?.action === 'suspend' ? 'Suspend' : 'Activate'}
        onConfirm={() => target && act.mutate({ id: target.m.id, action: target.action }, { onSettled: () => setTarget(null) })}
        message={target?.action === 'suspend' ? <>{target?.m.name} will be signed out and all of their API keys stop working until reactivated.</> : <>{target?.m.name} will be able to sign in and use their API keys again.</>} />
    </>
  );
}

/* ---------------- Merchant detail ---------------- */
interface Detail {
  profile: { id: string; name: string; email: string; phone: string | null; status: string; createdAt: string; lastLoginAt: string | null; businessName?: string; upiId: string | null; upiVerified: boolean };
  balance: Bal; transactions: Tx[]; withdrawals: Withdrawal[]; apiKeys: ApiKeyRow[];
  securityEvents: { id: string; eventType: string; createdAt: string }[];
}

export function MerchantDetail() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['admin', 'merchant', id], queryFn: () => api<Detail>(`/admin/merchants/${id}`), enabled: !!id });
  const act = useStatusAction();
  const d = q.data;
  if (q.isError) return <Card className="p-8 text-center text-sm text-muted">Merchant not found. <Link to="/admin/merchants" className="text-primary hover:underline">Back to merchants</Link></Card>;

  return (
    <>
      <Link to="/admin/merchants" className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-fg"><ArrowLeft className="h-3 w-3" />Merchants</Link>
      <PageHeader title={d?.profile.name ?? 'Merchant'} description={d ? `${d.profile.email} · ${d.profile.businessName ?? ''}` : undefined}
        action={d && <div className="flex items-center gap-3"><StatusBadge status={d.profile.status} />
          {d.profile.status === 'ACTIVE'
            ? <Button variant="danger" size="sm" loading={act.isPending} onClick={() => act.mutate({ id: d.profile.id, action: 'suspend' })}>Suspend</Button>
            : <Button size="sm" loading={act.isPending} onClick={() => act.mutate({ id: d.profile.id, action: 'activate' })}>Activate</Button>}</div>} />
      {q.isLoading ? <Skeleton className="h-40 w-full" /> : d && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard emphasis label="Available" value={formatINR(d.balance.available)} />
            <StatCard label="Reserved" value={formatINR(d.balance.reserved)} />
            <StatCard label="Total received" value={formatINR(d.balance.totalReceived)} />
            <StatCard label="Total withdrawn" value={formatINR(d.balance.totalWithdrawn)} />
          </div>
          <Card>
            <CardHeader title="Profile" />
            <dl className="grid gap-4 p-5 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-muted">Phone</dt><dd>{d.profile.phone ?? '—'}</dd></div>
              <div><dt className="text-xs text-muted">UPI ID</dt><dd className="font-mono text-xs">{d.profile.upiId ?? '—'} <span className="text-muted">({d.profile.upiVerified ? 'verified' : 'unverified'})</span></dd></div>
              <div><dt className="text-xs text-muted">Joined</dt><dd>{formatDate(d.profile.createdAt)}</dd></div>
              <div><dt className="text-xs text-muted">Last login</dt><dd>{formatDateTime(d.profile.lastLoginAt)}</dd></div>
            </dl>
          </Card>
          <Card><CardHeader title="Recent transactions" />
            <DataTable rowKey={(r) => r.id} rows={d.transactions} empty={{ title: 'No transactions' }} columns={[
              { header: 'Order', cell: (r) => <span className="font-mono text-xs">{r.orderId}</span> }, { header: 'Amount', cell: (r) => <span className="num">{formatINR(r.amount)}</span> },
              { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> }, { header: 'Verified', cell: (r) => formatDateTime(r.verifiedAt), hideOnMobile: true }]} /></Card>
          <Card><CardHeader title="Withdrawals" />
            <DataTable rowKey={(r) => r.id} rows={d.withdrawals} empty={{ title: 'No withdrawals' }} columns={[
              { header: 'Amount', cell: (r) => <span className="num">{formatINR(r.amount)}</span> }, { header: 'UPI', cell: (r) => <span className="font-mono text-xs">{r.upiId}</span> },
              { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> }, { header: 'Requested', cell: (r) => formatDateTime(r.requestedAt), hideOnMobile: true }]} /></Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader title="API keys" />
              <DataTable rowKey={(r) => r.id} rows={d.apiKeys} empty={{ title: 'No API keys' }} columns={[
                { header: 'Name', cell: (r) => r.name }, { header: 'Prefix', cell: (r) => <span className="font-mono text-xs">{r.prefix}…</span> }, { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> }]} /></Card>
            <Card><CardHeader title="Security events" />
              <DataTable rowKey={(r) => r.id} rows={d.securityEvents} empty={{ title: 'No events' }} columns={[
                { header: 'Event', cell: (r) => <span className="font-mono text-xs">{r.eventType}</span> }, { header: 'When', cell: (r) => formatDateTime(r.createdAt) }]} /></Card>
          </div>
        </div>
      )}
    </>
  );
}
