import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { Analytics } from '../../types';
import { Card, CardHeader, PageHeader, Select, Skeleton } from '../../components/ui';
import { StatCard } from '../../components/StatCard';
import { AreaMoney, BarsCount, LinePct } from '../../components/charts';
import { DataTable } from '../../components/DataTable';
import { formatINR } from '../../utils/format';
import { Activity } from 'lucide-react';

interface Usage {
  totalRequests: number; rateLimits: { api: number; verify: number; windowSeconds: number };
  daily: { day: string; requests: number; errors: number }[];
  byEndpoint: { endpoint: string; method: string; requests: number; avgMs: number }[];
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const a = useQuery({ queryKey: ['analytics', { days }], queryFn: () => api<Analytics>('/api/v1/analytics', { query: { days } }) });
  const u = useQuery({ queryKey: ['api-usage', days], queryFn: () => api<Usage>('/api/v1/api-usage', { query: { days } }) });
  const t = a.data?.totals;
  return (
    <>
      <PageHeader title="Analytics" description="Payment performance and API usage."
        action={<Select aria-label="Period" className="w-36" value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></Select>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={formatINR(t?.revenue)} loading={a.isLoading} />
        <StatCard label="Orders created" value={String(t?.created ?? 0)} loading={a.isLoading} />
        <StatCard label="Orders verified" value={String(t?.verified ?? 0)} loading={a.isLoading} />
        <StatCard label="Success rate" value={`${t?.successRate ?? 0}%`} loading={a.isLoading} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card><CardHeader title="Revenue" /><div className="p-4"><AreaMoney data={a.data?.series} loading={a.isLoading} dataKey="revenue" name="Revenue" /></div></Card>
        <Card><CardHeader title="Success rate" /><div className="p-4"><LinePct data={a.data?.series} loading={a.isLoading} dataKey="successRate" name="Success rate" /></div></Card>
        <Card className="lg:col-span-2">
          <CardHeader title="API requests" description={u.data ? `${u.data.totalRequests.toLocaleString('en-IN')} requests · limits: ${u.data.rateLimits.api}/min general, ${u.data.rateLimits.verify}/min verify` : undefined} />
          <div className="p-4"><BarsCount data={u.data?.daily} loading={u.isLoading} keys={[{ key: 'requests', name: 'Requests' }, { key: 'errors', name: 'Errors' }]} /></div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Top endpoints" />
          {u.isLoading ? <div className="p-5"><Skeleton className="h-24 w-full" /></div> : (
            <DataTable rowKey={(r) => r.method + r.endpoint} rows={u.data?.byEndpoint}
              empty={{ icon: <Activity className="h-5 w-5" />, title: 'No API traffic yet', description: 'Calls made with your API keys show up here.' }}
              columns={[
                { header: 'Endpoint', cell: (r) => <span className="font-mono text-xs"><b>{r.method}</b> {r.endpoint}</span> },
                { header: 'Requests', cell: (r) => <span className="num">{r.requests.toLocaleString('en-IN')}</span> },
                { header: 'Avg latency', cell: (r) => <span className="num">{r.avgMs} ms</span> },
              ]} />
          )}
        </Card>
      </div>
    </>
  );
}
