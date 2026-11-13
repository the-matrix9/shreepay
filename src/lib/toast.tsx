import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { cn } from './utils';

type Kind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: Kind; message: string }
const Ctx = createContext<{ toast: (kind: Kind, message: string) => void }>({ toast: () => undefined });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const dismiss = (id: number) => setItems((s) => s.filter((t) => t.id !== id));
  const toast = useCallback((kind: Kind, message: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s.slice(-3), { id, kind, message }]);
    setTimeout(() => dismiss(id), 4500);
  }, []);
  const Icon = { success: CheckCircle2, error: XCircle, info: Info };
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6" role="status" aria-live="polite">
        {items.map((t) => {
          const I = Icon[t.kind];
          return (
            <div key={t.id} className="pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-3 rounded-xl border border-line bg-card p-3 shadow-card">
              <I className={cn('mt-0.5 h-5 w-5 shrink-0', t.kind === 'success' && 'text-success', t.kind === 'error' && 'text-danger', t.kind === 'info' && 'text-primary')} />
              <p className="flex-1 text-sm">{t.message}</p>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-muted hover:text-fg"><X className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
