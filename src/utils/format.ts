const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Display only. The backend is the single source of truth for every amount and balance. */
export const formatINR = (n: number | null | undefined) => inr.format(n ?? 0);
export const formatCompactINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 }).format(n);

export const formatDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const formatDateTime = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
export const shortDay = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
export const toDateInput = (d: Date) => d.toISOString().slice(0, 10);
