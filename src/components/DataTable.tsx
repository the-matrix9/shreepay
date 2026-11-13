import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, EmptyState, Skeleton } from './ui';
import { cn } from '../lib/utils';

export interface Column<T> { header: string; cell: (row: T) => ReactNode; className?: string; hideOnMobile?: boolean }

export function DataTable<T>({ columns, rows, loading, empty, rowKey }: {
  columns: Column<T>[]; rows: T[] | undefined; loading?: boolean; rowKey: (r: T) => string;
  empty?: { title: string; description?: string; icon?: ReactNode; action?: ReactNode };
}) {
  if (!loading && rows && rows.length === 0) return <EmptyState title={empty?.title ?? 'Nothing here yet'} description={empty?.description} icon={empty?.icon} action={empty?.action} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
            {columns.map((c) => <th key={c.header} className={cn('whitespace-nowrap px-5 py-3 font-medium', c.hideOnMobile && 'hidden md:table-cell', c.className)}>{c.header}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {loading || !rows
            ? Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>{columns.map((c) => <td key={c.header} className={cn('px-5 py-3.5', c.hideOnMobile && 'hidden md:table-cell')}><Skeleton className="h-4 w-full max-w-[140px]" /></td>)}</tr>
              ))
            : rows.map((r) => (
                <tr key={rowKey(r)} className="transition hover:bg-subtle/60">
                  {columns.map((c) => <td key={c.header} className={cn('px-5 py-3.5 align-middle', c.hideOnMobile && 'hidden md:table-cell', c.className)}>{c.cell(r)}</td>)}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted">
      <span>Page {page} of {pages} · {total.toLocaleString('en-IN')} results</span>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
        <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
