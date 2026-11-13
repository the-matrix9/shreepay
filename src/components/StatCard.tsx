import type { ReactNode } from 'react';
import { Skeleton } from './ui';
import { cn } from '../lib/utils';

export function StatCard({ label, value, hint, icon, loading, emphasis }: { label: string; value: string; hint?: string; icon?: ReactNode; loading?: boolean; emphasis?: boolean }) {
  return (
    <div className={cn('rounded-2xl border border-line bg-card p-5 shadow-card transition hover:-translate-y-0.5', emphasis && 'border-primary/40 bg-gradient-to-br from-primary/10 to-transparent')}>
      <div className="flex items-center justify-between text-muted">
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        {icon}
      </div>
      {loading ? <Skeleton className="mt-3 h-8 w-32" /> : <p className="num mt-2 text-2xl font-semibold tracking-tight sm:text-[1.7rem]">{value}</p>}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
