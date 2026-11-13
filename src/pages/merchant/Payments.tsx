import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { api, ApiError, type Page } from '../../services/api';
import type { PaymentOrder } from '../../types';
import { Button, Card, CardHeader, CopyButton, Field, Input, PageHeader, StatusBadge } from '../../components/ui';
import { DataTable, Pagination } from '../../components/DataTable';
import { useToast } from '../../lib/toast';
import { formatDateTime, formatINR } from '../../utils/format';

const schema = z.object({
  orderId: z.string().trim().regex(/^[A-Za-z0-9_-]{3,64}$/, '3–64 characters: letters, digits, _ or -'),
  amount: z.string().trim().regex(/^\d{1,7}(\.\d{1,2})?$/, 'Enter an amount like 500 or 499.50').refine((v) => Number(v) > 0, 'Must be greater than 0'),
});
type Form = z.infer<typeof schema>;

export default function Payments() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [created, setCreated] = useState<PaymentOrder | null>(null);
  const [page, setPage] = useState(1);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  // Payments are verified automatically by the server; the page just refreshes while something is pending.
  const list = useQuery({
    queryKey: ['payments', page],
    queryFn: () => api<Page<PaymentOrder>>('/api/v1/payments', { query: { page, pageSize: 10 } }),
    refetchInterval: (q) => (q.state.data?.items.some((o) => o.status === 'PENDING') ? 4000 : false),
  });
  const live = useQuery({
    queryKey: ['payment', created?.orderId],
    enabled: !!created && created.status === 'PENDING',
    queryFn: () => api<PaymentOrder>(`/api/v1/payments/${encodeURIComponent(created!.orderId)}`),
    refetchInterval: (q) => (q.state.data?.status && q.state.data.status !== 'PENDING' ? false : 3000),
  });
  const current = live.data && created && live.data.orderId === created.orderId ? live.data : created;
  const wasCredited = useRef(false);
  useEffect(() => {
    if (current?.status === 'VERIFIED' && !wasCredited.current) {
      wasCredited.current = true;
      toast('success', `Order ${current.orderId} paid and credited`);
      qc.invalidateQueries(); // balances, lists and analytics all changed
    }
  }, [current?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = useMutation({
    mutationFn: (v: Form) => api<PaymentOrder>('/api/v1/payments/create', { method: 'POST', body: { orderId: v.orderId, amount: v.amount } }),
    onSuccess: (o) => { wasCredited.current = false; setCreated(o); reset(); toast('success', 'Payment link generated'); qc.invalidateQueries({ queryKey: ['payments'] }); },
    onError: (e) => toast('error', e instanceof ApiError ? e.message : 'Could not create payment'),
  });

  return (
    <>
      <PageHeader title="Payments" description="Generate a payment link for your customer, it is verified and credited automatically as soon as they pay." />
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Create payment" />
          <form className="space-y-4 p-5" noValidate onSubmit={handleSubmit((v) => create.mutate(v))}>
            <Field label="Order ID" error={errors.orderId?.message} hint="Your own reference, unique per order."><Input placeholder="ORDER123" autoComplete="off" invalid={!!errors.orderId} {...register('orderId')} /></Field>
            <Field label="Amount (₹)" error={errors.amount?.message}><Input inputMode="decimal" placeholder="500" autoComplete="off" invalid={!!errors.amount} {...register('amount')} /></Field>
            <Button type="submit" className="w-full" loading={create.isPending}><CreditCard className="h-4 w-4" />Generate payment</Button>
          </form>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Payment details" />
          {created && current ? (
            <div className="space-y-4 p-5 animate-fade-in">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-xs text-muted">Order ID</dt><dd className="mt-0.5 font-mono">{current.orderId}</dd></div>
                <div><dt className="text-xs text-muted">Amount</dt><dd className="num mt-0.5 font-semibold">{formatINR(current.amount)}</dd></div>
                <div><dt className="text-xs text-muted">Status</dt><dd className="mt-1"><StatusBadge status={current.status} /></dd></div>
              </dl>
              <div>
                <p className="mb-1.5 text-xs text-muted">Payment URL</p>
                <div className="break-all rounded-lg border border-line bg-subtle px-3 py-2 font-mono text-xs">{current.paymentUrl}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {current.paymentUrl && <CopyButton value={current.paymentUrl} label="Copy Payment URL" />}
                {current.paymentUrl && <a href={current.paymentUrl} target="_blank" rel="noopener noreferrer"><Button type="button" variant="secondary" size="sm"><ExternalLink className="h-3.5 w-3.5" />Open Payment Page</Button></a>}
              </div>
              {current.status === 'PENDING' && <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />Waiting for the customer to pay. This updates automatically.</p>}
              {current.status === 'EXPIRED' && <p className="text-sm text-warning">This payment link expired before a payment was detected. Create a new one.</p>}
              {current.status === 'VERIFIED' && <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" />Payment received and credited to your balance.</p>}
            </div>
          ) : (
            <div className="grid h-full min-h-[220px] place-items-center p-6 text-center text-sm text-muted">Your generated payment link will appear here.</div>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="All payment orders" />
        <DataTable rowKey={(r) => r.orderId} rows={list.data?.items} loading={list.isLoading}
          empty={{ icon: <CreditCard className="h-5 w-5" />, title: 'No payment orders yet', description: 'Orders you create appear here.' }}
          columns={[
            { header: 'Order ID', cell: (r) => <span className="font-mono text-xs">{r.orderId}</span> },
            { header: 'Amount', cell: (r) => <span className="num font-medium">{formatINR(r.amount)}</span> },
            { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
            { header: 'Created', cell: (r) => formatDateTime(r.createdAt), hideOnMobile: true },
            { header: 'Actions', cell: (r) => (
              <div className="flex gap-2">
                {r.paymentUrl && r.status === 'PENDING' && <CopyButton value={r.paymentUrl} label="Link" />}
                {r.status === 'PENDING' && <span className="inline-flex items-center gap-1.5 text-xs text-muted"><Loader2 className="h-3 w-3 animate-spin" />Auto-verifying</span>}
              </div>) },
          ]} />
        {list.data && <Pagination page={page} pageSize={list.data.pageSize} total={list.data.total} onPage={setPage} />}
      </Card>
    </>
  );
}
