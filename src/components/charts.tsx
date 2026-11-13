import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState, Skeleton } from './ui';
import { BarChart3 } from 'lucide-react';
import { formatCompactINR, formatINR, shortDay } from '../utils/format';

const axis = { stroke: 'rgb(var(--muted))', fontSize: 11, tickLine: false, axisLine: false } as const;
const tooltipStyle = { background: 'rgb(var(--card))', border: '1px solid rgb(var(--line))', borderRadius: 12, fontSize: 12, color: 'rgb(var(--fg))' };
const C1 = 'rgb(var(--primary))';
const C2 = 'rgb(var(--accent))';

type Row = { day: string } & Record<string, number | string>;

function Frame({ data, loading, children }: { data?: Row[]; loading?: boolean; children: React.ReactElement }) {
  if (loading) return <Skeleton className="h-60 w-full" />;
  if (!data || data.length === 0) return <EmptyState icon={<BarChart3 className="h-5 w-5" />} title="No data for this period" description="Charts appear once there is activity." />;
  return <div className="h-60 w-full"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>;
}

export function AreaMoney({ data, loading, dataKey, name }: { data?: Row[]; loading?: boolean; dataKey: string; name: string }) {
  return (
    <Frame data={data} loading={loading}>
      <AreaChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
        <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C1} stopOpacity={0.35} /><stop offset="100%" stopColor={C1} stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid vertical={false} stroke="rgb(var(--line))" />
        <XAxis dataKey="day" tickFormatter={shortDay} {...axis} />
        <YAxis tickFormatter={formatCompactINR} width={64} {...axis} />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => shortDay(String(l))} formatter={(v) => [formatINR(Number(v)), name]} />
        <Area type="monotone" dataKey={dataKey} stroke={C1} strokeWidth={2} fill="url(#g1)" />
      </AreaChart>
    </Frame>
  );
}

export function BarsCount({ data, loading, keys }: { data?: Row[]; loading?: boolean; keys: { key: string; name: string }[] }) {
  return (
    <Frame data={data} loading={loading}>
      <BarChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} stroke="rgb(var(--line))" />
        <XAxis dataKey="day" tickFormatter={shortDay} {...axis} />
        <YAxis allowDecimals={false} {...axis} />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => shortDay(String(l))} cursor={{ fill: 'rgb(var(--subtle))' }} />
        {keys.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {keys.map((k, i) => <Bar key={k.key} dataKey={k.key} name={k.name} fill={i === 0 ? C1 : C2} radius={[4, 4, 0, 0]} />)}
      </BarChart>
    </Frame>
  );
}

export function LinePct({ data, loading, dataKey, name }: { data?: Row[]; loading?: boolean; dataKey: string; name: string }) {
  return (
    <Frame data={data} loading={loading}>
      <LineChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} stroke="rgb(var(--line))" />
        <XAxis dataKey="day" tickFormatter={shortDay} {...axis} />
        <YAxis domain={[0, 100]} unit="%" {...axis} />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => shortDay(String(l))} formatter={(v) => [`${Number(v)}%`, name]} />
        <Line type="monotone" dataKey={dataKey} stroke={C2} strokeWidth={2} dot={false} />
      </LineChart>
    </Frame>
  );
}
