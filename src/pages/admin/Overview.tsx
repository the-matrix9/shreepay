import { useQuery } from '@tanstack/react-query';
import { Banknote, CheckCircle2, Clock, IndianRupee, ReceiptText, UserCheck, Users } from 'lucide-react';
import { api } from '../../services/api';
import { StatCard } from '../../components/StatCard';
import { AreaMoney, BarsCount } from '../../components/charts';
import { Card, CardHeader, PageHeader } from '../../components/ui';
import { formatINR } from '../../utils/format';

interface Dash {
  cards: { totalMerchants: number; activeMerchants: number; totalTransactions: number; totalVolume: number; pendingWithdrawals: number; pendingWithdrawalAmount: number; paidWithdrawals: number; paidWithdrawalAmount: number };
  charts: { paymentVolume: { day: string; count: number; volume: number }[]; withdrawals: { day: string; count: number; amount: number }[]; merchantGrowth: { day: string; count: number }[] };
}

export default function AdminOverview() {
  const q = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: () => api<Dash>('/admin/dashboard') });
  const c = q.data?.cards;
  const l = q.isLoading;
  return (
    <>
      <PageHeader title="Platform overview" description="Last 30 days for charts; totals are all-time." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total merchants" value={String(c?.totalMerchants ?? 0)} icon={<Users className="h-4 w-4" />} loading={l} />
        <StatCard label="Active merchants" value={String(c?.activeMerchants ?? 0)} icon={<UserCheck className="h-4 w-4" />} loading={l} />
        <StatCard label="Total transactions" value={(c?.totalTransactions ?? 0).toLocaleString('en-IN')} icon={<ReceiptText className="h-4 w-4" />} loading={l} />
        <StatCard emphasis label="Total payment volume" value={formatINR(c?.totalVolume)} icon={<IndianRupee className="h-4 w-4" />} loading={l} />
        <StatCard label="Pending withdrawals" value={String(c?.pendingWithdrawals ?? 0)} hint={`${formatINR(c?.pendingWithdrawalAmount)} awaiting payout`} icon={<Clock className="h-4 w-4" />} loading={l} />
        <StatCard label="Paid withdrawals" value={String(c?.paidWithdrawals ?? 0)} hint={`${formatINR(c?.paidWithdrawalAmount)} paid out`} icon={<CheckCircle2 className="h-4 w-4" />} loading={l} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card><CardHeader title="Payment volume" /><div className="p-4"><AreaMoney data={q.data?.charts.paymentVolume} loading={l} dataKey="volume" name="Volume" /></div></Card>
        <Card><CardHeader title="Daily transactions" /><div className="p-4"><BarsCount data={q.data?.charts.paymentVolume} loading={l} keys={[{ key: 'count', name: 'Transactions' }]} /></div></Card>
        <Card><CardHeader title="Withdrawals paid" /><div className="p-4"><AreaMoney data={q.data?.charts.withdrawals} loading={l} dataKey="amount" name="Paid out" /></div></Card>
        <Card><CardHeader title="Merchant growth" description="New signups per day" /><div className="p-4"><BarsCount data={q.data?.charts.merchantGrowth} loading={l} keys={[{ key: 'count', name: 'New merchants' }]} /></div></Card>
      </div>
      <p className="mt-6 flex items-center gap-2 text-xs text-muted"><Banknote className="h-3.5 w-3.5" />Withdrawals are transferred manually outside ShreePay; marking PAID records that you did it.</p>
    </>
  );
}
