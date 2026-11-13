import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Check, Copy, Loader2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../lib/toast';

/* ---------- Button ---------- */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:opacity-90 shadow-sm',
  secondary: 'border border-line bg-card hover:bg-subtle',
  ghost: 'hover:bg-subtle',
  danger: 'bg-danger text-white hover:opacity-90',
};
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; size?: 'sm' | 'md' }>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...p }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn('inline-flex items-center justify-center gap-2 rounded-lg font-medium transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50', size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm', variants[variant], className)}
      {...p}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  ),
);

/* ---------- Card ---------- */
export const Card = ({ className, children }: { className?: string; children: ReactNode }) => (
  <section className={cn('rounded-2xl border border-line bg-card shadow-card', className)}>{children}</section>
);
export const CardHeader = ({ title, description, action }: { title: string; description?: string; action?: ReactNode }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
    </div>
    {action}
  </div>
);
export const PageHeader = ({ title, description, action }: { title: string; description?: string; action?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </div>
    {action}
  </div>
);

/* ---------- Form controls ---------- */
const field = 'h-10 w-full rounded-lg border border-line bg-card px-3 text-sm placeholder:text-muted/70 transition focus:border-primary disabled:opacity-60';
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(({ className, invalid, ...p }, ref) => (
  <input ref={ref} aria-invalid={invalid || undefined} className={cn(field, invalid && 'border-danger', className)} {...p} />
));
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => (
  <select ref={ref} className={cn(field, 'pr-8', className)} {...p} />
));
export const Field = ({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
    {children}
    {error ? <span role="alert" className="mt-1 block text-xs text-danger">{error}</span> : hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
  </label>
);

/* ---------- Status badge ---------- */
const tone: Record<string, string> = {
  VERIFIED: 'success', PAID: 'success', ACTIVE: 'success',
  PENDING: 'warning', PROCESSING: 'info',
  FAILED: 'danger', REJECTED: 'danger', REVOKED: 'danger', SUSPENDED: 'danger', DISABLED: 'danger',
  EXPIRED: 'neutral', CANCELLED: 'neutral', DUPLICATE: 'neutral',
};
const toneCls: Record<string, string> = {
  success: 'bg-success/10 text-success', warning: 'bg-warning/10 text-warning', danger: 'bg-danger/10 text-danger',
  info: 'bg-primary/10 text-primary', neutral: 'bg-subtle text-muted',
};
export const StatusBadge = ({ status }: { status: string }) => (
  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', toneCls[tone[status] ?? 'neutral'])}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {status}
  </span>
);

/* ---------- Skeleton / empty ---------- */
export const Skeleton = ({ className }: { className?: string }) => <div className={cn('skeleton', className)} aria-hidden />;
export const EmptyState = ({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center px-6 py-14 text-center">
    {icon && <div className="mb-3 rounded-full bg-subtle p-3 text-muted">{icon}</div>}
    <p className="text-sm font-medium">{title}</p>
    {description && <p className="mt-1 max-w-sm text-xs text-muted">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md animate-fade-in rounded-t-2xl border border-line bg-card shadow-card sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted hover:bg-subtle"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
    </>}>
      <div className="text-sm text-muted">{message}</div>
    </Modal>
  );
}

/* ---------- Copy ---------- */
export function CopyButton({ value, label = 'Copy', className }: { value: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  const { toast } = useToast();
  return (
    <Button
      type="button" variant="secondary" size="sm" className={className}
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1800); }
        catch { toast('error', 'Copy failed. Select and copy manually.'); }
      }}
    >
      {done ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? 'Copied' : label}
    </Button>
  );
}
