import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, ApiError, type Page } from '../../services/api';
import type { Balance, Me, Withdrawal } from '../../types';
import { Button, Card, CardHeader, ConfirmModal, Field, Input, PageHeader, StatusBadge } from '../../components/ui';
import { DataTable, Pagination } from '../../components/DataTable';
import { StatCard } from '../../components/StatCard';
import { useToast } from '../../lib/toast';
import { useAuth } from '../../lib/auth';
import { formatDateTime, formatINR } from '../../utils/format';

const UPI_RE = /^[A-Za-z0-9._-]{2,64}@[A-Za-z][A-Za-z0-9]{1,32}$/;
const schema = z.object({
  amount: z.string().trim().regex(/^\d{1,7}(\.\d{1,2})?$/, 'Enter a valid amount').refine((v) => Number(v) > 0, 'Must be greater than 0'),
  upiId: z.string().trim().regex(UPI_RE, 'Enter a valid UPI ID, e.g. name@bank'),
});
type Form = z.infer<typeof schema>;

export default function Withdrawals() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<Form | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const balance = useQuery({ queryKey: ['balance'], queryFn: () => api<Balance>('/api/v1/balance') });
  const list = useQuery({ queryKey: ['withdrawals', page], queryFn: () => api<Page<Withdrawal>>('/api/v1/withdrawals', { query: { page, pageSize: 10 } }) });
  const me = useQuery({ queryKey: ['profile'], queryFn: () => api<{ upiId: string | null }>('/api/v1/profile') });
  const savedUpi = me.data?.upiId ?? user?.profile?.upiId ?? '';

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema), values: { amount: '', upiId: savedUpi } });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['balance'] }); qc.invalidateQueries({ queryKey: ['withdrawals'] }); };

  const request = useMutation({
    mutationFn: (v: Form) => api<Withdrawal>('/api/v1/withdrawals', { method: 'POST', body: v }),
    onSuccess: () => { toast('success', 'Withdrawal requested. An admin will review and pay it manually.'); setPending(null); reset({ amount: '', upiId: savedUpi }); refresh(); },
    onError: (e) => { setPending(null); toast('error', e instanceof ApiError ? e.message : 'Request failed'); },
  });
  const cancel = useMutation({
    mutationFn: (id: string) => api(`/api/v1/withdrawals/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast('success', 'Withdrawal cancelled and balance released'); setCancelId(null); refresh(); },
    onError: (e) => { setCancelId(null); toast('error', e instanceof ApiError ? e.message : 'Could not cancel'); },
  });

  const b = balance.data;
  return (
    <>
      <PageHeader title="Withdrawals" description="Request a payout. Withdrawals are reviewed and transferred manually by an admin." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard emphasis label="Available balance" value={formatINR(b?.available)} loading={balance.isLoading} />
        <StatCard label="Reserved balance" value={formatINR(b?.reserved)} hint="In pending withdrawals" loading={balance.isLoading} />
        <StatCard label="Minimum withdrawal" value={formatINR(b?.minWithdrawal)} loading={balance.isLoading} />
      </div>

      <Card className="mt-4">
        <CardHeader title="Request withdrawal" />
        {!savedUpi ? (
          <div className="flex items-start gap-3 p-5 text-sm"><Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p>Save your UPI ID in <Link to="/dashboard/settings" className="font-medium text-primary hover:underline">Settings</Link> before requesting a withdrawal.</p></div>
        ) : (
          <form noValidate className="grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-start" onSubmit={handleSubmit((v) => setPending(v))}>
            <Field label="Amount (₹)" error={errors.amount?.message}><Input inputMode="decimal" placeholder="500" invalid={!!errors.amount} {...register('amount')} /></Field>
            <Field label="UPI ID" error={errors.upiId?.message} hint="Must match the UPI ID saved in Settings."><Input autoComplete="off" invalid={!!errors.upiId} {...register('upiId')} /></Field>
            <Button type="submit" className="sm:mt-[22px]"><Banknote className="h-4 w-4" />Request</Button>
          </form>
        )}
      </Card>

      <Card className="mt-4">
        <CardHeader title="Withdrawal history" />
        <DataTable rowKey={(r) => r.id} rows={list.data?.items} loading={list.isLoading}
          empty={{ icon: <Banknote className="h-5 w-5" />, title: 'No withdrawals yet', description: 'Your payout requests will be tracked here.' }}
          columns={[
            { header: 'Amount', cell: (r) => <span className="num font-medium">{formatINR(r.amount)}</span> },
            { header: 'UPI', cell: (r) => <span className="font-mono text-xs">{r.upiId}</span> },
            { header: 'Status', cell: (r) => <div><StatusBadge status={r.status} />{r.status === 'REJECTED' && r.adminNote && <p className="mt-1 max-w-[220px] text-xs text-muted">{r.adminNote}</p>}</div> },
            { header: 'Requested', cell: (r) => formatDateTime(r.requestedAt), hideOnMobile: true },
            { header: 'Processed', cell: (r) => formatDateTime(r.processedAt), hideOnMobile: true },
            { header: 'Paid', cell: (r) => formatDateTime(r.paidAt), hideOnMobile: true },
            { header: '', cell: (r) => r.status === 'PENDING' ? <Button size="sm" variant="ghost" onClick={() => setCancelId(r.id)}>Cancel</Button> : null },
          ]} />
        {list.data && <Pagination page={page} pageSize={list.data.pageSize} total={list.data.total} onPage={setPage} />}
      </Card>

      <ConfirmModal open={!!pending} onClose={() => setPending(null)} loading={request.isPending} confirmLabel="Request withdrawal"
        title="Confirm withdrawal" onConfirm={() => pending && request.mutate(pending)}
        message={<>You are requesting <b className="text-fg">{pending && formatINR(Number(pending.amount))}</b> to <b className="font-mono text-fg">{pending?.upiId}</b>. The amount is reserved now and paid manually after admin review.</>} />
      <ConfirmModal open={!!cancelId} onClose={() => setCancelId(null)} loading={cancel.isPending} confirmLabel="Cancel withdrawal" danger
        title="Cancel withdrawal?" onConfirm={() => cancelId && cancel.mutate(cancelId)} message="The reserved amount returns to your available balance." />
    </>
  );
}

export type { Me };
