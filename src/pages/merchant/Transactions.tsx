import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ReceiptText, Search, X } from 'lucide-react';
import { api, type Page } from '../../services/api';
import type { PaymentOrder } from '../../types';
import { Button, Card, Input, PageHeader, Select, StatusBadge } from '../../components/ui';
import { DataTable, Pagination } from '../../components/DataTable';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDateTime, formatINR } from '../../utils/format';

const statuses = ['PENDING', 'VERIFIED', 'FAILED', 'EXPIRED'];

export default function Transactions() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounce(q);

  useEffect(() => { setQ(params.get('q') ?? ''); }, [params]);
  useEffect(() => { setPage(1); }, [dq, status, from, to, min, max]);

  const query = {
    page, pageSize: 15, q: dq || undefined, status: status || undefined,
    from: from ? new Date(from).toISOString() : undefined, to: to ? new Date(to + 'T23:59:59').toISOString() : undefined,
    minAmount: /^\d+(\.\d{1,2})?$/.test(min) ? min : undefined, maxAmount: /^\d+(\.\d{1,2})?$/.test(max) ? max : undefined,
  };
  const list = useQuery({ queryKey: ['payments', 'tx', query], queryFn: () => api<Page<PaymentOrder>>('/api/v1/payments', { query }), placeholderData: (p) => p });
  const filtered = !!(dq || status || from || to || min || max);
  const clear = () => { setQ(''); setStatus(''); setFrom(''); setTo(''); setMin(''); setMax(''); setParams({}); };

  return (
    <>
      <PageHeader title="Transactions" description="Search and filter every order you've created." />
      <Card>
        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input aria-label="Search by order ID" placeholder="Search order ID…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} maxLength={64} />
          </div>
          <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>{statuses.map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Input type="date" aria-label="From date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" aria-label="To date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          <div className="flex gap-2">
            <Input inputMode="decimal" aria-label="Minimum amount" placeholder="Min ₹" value={min} onChange={(e) => setMin(e.target.value)} />
            <Input inputMode="decimal" aria-label="Maximum amount" placeholder="Max ₹" value={max} onChange={(e) => setMax(e.target.value)} />
          </div>
        </div>
        {filtered && <div className="flex items-center justify-between border-b border-line px-5 py-2 text-xs text-muted"><span>{list.data?.total ?? 0} matching</span><Button size="sm" variant="ghost" onClick={clear}><X className="h-3 w-3" />Clear filters</Button></div>}
        <DataTable rowKey={(r) => r.orderId} rows={list.data?.items} loading={list.isLoading}
          empty={{ icon: <ReceiptText className="h-5 w-5" />, title: filtered ? 'No matching transactions' : 'No transactions yet', description: filtered ? 'Try different filters.' : 'Orders appear here after you create them.' }}
          columns={[
            { header: 'Order ID', cell: (r) => <span className="font-mono text-xs">{r.orderId}</span> },
            { header: 'Amount', cell: (r) => <span className="num font-medium">{formatINR(r.amount)}</span> },
            { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
            { header: 'Created', cell: (r) => formatDateTime(r.createdAt), hideOnMobile: true },
            { header: 'Verified', cell: (r) => formatDateTime(r.verifiedAt), hideOnMobile: true },
          ]} />
        {list.data && <Pagination page={page} pageSize={list.data.pageSize} total={list.data.total} onPage={setPage} />}
      </Card>
    </>
  );
}
