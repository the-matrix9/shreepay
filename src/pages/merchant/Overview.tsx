import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowRight, Clock, HandCoins, ReceiptText, Wallet } from 'lucide-react';
import { api, type Page } from '../../services/api';
import type { Analytics, Balance, PaymentOrder } from '../../types';
import { StatCard } from '../../components/StatCard';
import { AreaMoney, BarsCount, LinePct } from '../../components/charts';
import { DataTable } from '../../components/DataTable';
import { Card, CardHeader, Input, PageHeader, StatusBadge, Button } from '../../components/ui';
import { formatDate, formatINR, toDateInput } from '../../utils/format';
import { useAuth } from '../../lib/auth';
import { cn } from '../../lib/utils';

const presets = [{ k: '1', l: 'Today' }, { k: '7', l: '7 Days' }, { k: '30', l: '30 Days' }, { k: '90', l: '90 Days' }, { k: 'custom', l: 'Custom' }];

export default function Overview() {
  const { user } = useAuth();
  const [preset, setPreset] = useState('30');
  const [from, setFrom] = useState(toDateInput(new Date(Date.now() - 30 * 864e5)));
  const [to, setTo] = useState(toDateInput(new Date()));
  const rangeQuery = preset === 'custom' ? { from: new Date(from).toISOString(), to: new Date(to + 'T23:59:59').toISOString() } : { days: Number(preset) };

  const balance = useQuery({ queryKey: ['balance'], queryFn: () => api<Balance>('/api/v1/balance') });
  const analytics = useQuery({ queryKey: ['analytics', rangeQuery], queryFn: () => api<Analytics>('/api/v1/analytics', { query: rangeQuery }) });
  const recent = useQuery({ queryKey: ['payments', 'recent'], queryFn: () => api<Page<PaymentOrder>>('/api/v1/payments', { query: { pageSize: 6 } }) });
  const b = balance.data;

  return (
    <>
      <PageHeader title={`Hello, ${user?.name.split(' ')[0] ?? ''}`} description="Here's how your money is moving."
        action={<Link to="/dashboard/payments"><Button>Create payment</Button></Link>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard emphasis label="Available balance" value={formatINR(b?.available)} hint="Ready to withdraw" icon={<Wallet className="h-4 w-4" />} loading={balance.isLoading} />
        <StatCard label="Reserved balance" value={formatINR(b?.reserved)} hint="Held for pending withdrawals" icon={<Clock className="h-4 w-4" />} loading={balance.isLoading} />
        <StatCard label="Total received" value={formatINR(b?.totalReceived)} hint="Lifetime verified payments" icon={<HandCoins className="h-4 w-4" />} loading={balance.isLoading} />
        <StatCard label="Total withdrawn" value={formatINR(b?.totalWithdrawn)} hint="Paid out to your UPI" icon={<ArrowDownToLine className="h-4 w-4" />} loading={balance.isLoading} />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-line bg-card p-1" role="tablist" aria-label="Date range">
          {presets.map((p) => (
            <button key={p.k} role="tab" aria-selected={preset === p.k} onClick={() => setPreset(p.k)}
              className={cn('rounded-md px-3 py-1.5 text-xs font-medium text-muted transition', preset === p.k && 'bg-primary text-primary-fg shadow-sm')}>{p.l}</button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <Input type="date" aria-label="From" className="h-9 w-40" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-muted">–</span>
            <Input type="date" aria-label="To" className="h-9 w-40" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue" description={analytics.data ? `${formatINR(analytics.data.totals.revenue)} verified in this period` : undefined} />
          <div className="p-4"><AreaMoney data={analytics.data?.series} loading={analytics.isLoading} dataKey="revenue" name="Revenue" /></div>
        </Card>
        <Card>
          <CardHeader title="Success rate" description={analytics.data ? `${analytics.data.totals.successRate}% of ${analytics.data.totals.created} orders` : undefined} />
          <div className="p-4"><LinePct data={analytics.data?.series} loading={analytics.isLoading} dataKey="successRate" name="Success rate" /></div>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title="Transactions" description="Orders created vs. verified per day" />
          <div className="p-4"><BarsCount data={analytics.data?.series} loading={analytics.isLoading} keys={[{ key: 'created', name: 'Created' }, { key: 'verified', name: 'Verified' }]} /></div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Recent transactions" action={<Link to="/dashboard/transactions" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">View all <ArrowRight className="h-3 w-3" /></Link>} />
        <DataTable rowKey={(r) => r.orderId} rows={recent.data?.items} loading={recent.isLoading}
          empty={{ icon: <ReceiptText className="h-5 w-5" />, title: 'No payments yet', description: 'Create your first payment to see it here.', action: <Link to="/dashboard/payments"><Button size="sm">Create payment</Button></Link> }}
          columns={[
            { header: 'Order ID', cell: (r) => <span className="font-mono text-xs">{r.orderId}</span> },
            { header: 'Amount', cell: (r) => <span className="num font-medium">{formatINR(r.amount)}</span> },
            { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
            { header: 'Date', cell: (r) => formatDate(r.createdAt), hideOnMobile: true },
            { header: 'Action', cell: (r) => <Link className="text-xs font-medium text-primary hover:underline" to={`/dashboard/transactions?q=${encodeURIComponent(r.orderId)}`}>View</Link> },
          ]} />
      </Card>
    </>
  );
}
