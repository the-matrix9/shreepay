import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, KeyRound, Plus } from 'lucide-react';
import { api, ApiError } from '../../services/api';
import type { ApiKeyRow } from '../../types';
import { Button, Card, CardHeader, ConfirmModal, CopyButton, Field, Input, Modal, PageHeader, StatusBadge } from '../../components/ui';
import { DataTable } from '../../components/DataTable';
import { useToast } from '../../lib/toast';
import { formatDateTime } from '../../utils/format';

const schema = z.object({ name: z.string().trim().min(2, 'At least 2 characters').max(60) });

export default function ApiKeys() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState<string | null>(null); // lives only in component memory
  const [revoke, setRevoke] = useState<ApiKeyRow | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ name: string }>({ resolver: zodResolver(schema) });

  const keys = useQuery({ queryKey: ['api-keys'], queryFn: () => api<ApiKeyRow[]>('/api/v1/api-keys') });
  const create = useMutation({
    mutationFn: (v: { name: string }) => api<ApiKeyRow & { key: string }>('/api/v1/api-keys', { method: 'POST', body: v }),
    onSuccess: (r) => { setSecret(r.key); setOpen(false); reset(); qc.invalidateQueries({ queryKey: ['api-keys'] }); },
    onError: (e) => toast('error', e instanceof ApiError ? e.message : 'Could not create key'),
  });
  const del = useMutation({
    mutationFn: (id: string) => api(`/api/v1/api-keys/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast('success', 'API key revoked'); setRevoke(null); qc.invalidateQueries({ queryKey: ['api-keys'] }); },
    onError: (e) => { setRevoke(null); toast('error', e instanceof ApiError ? e.message : 'Could not revoke key'); },
  });

  return (
    <>
      <PageHeader title="API keys" description="Use keys to call the ShreePay API from your server. Never expose them in a browser or mobile app."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Create API key</Button>} />
      <Card>
        <CardHeader title="Your keys" />
        <DataTable rowKey={(r) => r.id} rows={keys.data} loading={keys.isLoading}
          empty={{ icon: <KeyRound className="h-5 w-5" />, title: 'No API keys yet', description: 'Create a key to start creating and verifying payments.', action: <Button size="sm" onClick={() => setOpen(true)}>Create API key</Button> }}
          columns={[
            { header: 'Name', cell: (r) => <span className="font-medium">{r.name}</span> },
            { header: 'Prefix', cell: (r) => <span className="font-mono text-xs">{r.prefix}…</span> },
            { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
            { header: 'Created', cell: (r) => formatDateTime(r.createdAt), hideOnMobile: true },
            { header: 'Last used', cell: (r) => (r.lastUsedAt ? formatDateTime(r.lastUsedAt) : 'Never'), hideOnMobile: true },
            { header: '', cell: (r) => r.status === 'ACTIVE' ? <Button size="sm" variant="ghost" className="text-danger" onClick={() => setRevoke(r)}>Revoke</Button> : null },
          ]} />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Create API key"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button loading={create.isPending} onClick={handleSubmit((v) => create.mutate(v))}>Create key</Button></>}>
        <form noValidate onSubmit={handleSubmit((v) => create.mutate(v))}>
          <Field label="Key name" error={errors.name?.message} hint="For example: Production server"><Input autoFocus invalid={!!errors.name} {...register('name')} /></Field>
        </form>
      </Modal>

      <Modal open={!!secret} onClose={() => setSecret(null)} title="Your new API key" footer={<Button onClick={() => setSecret(null)}>I've stored it securely</Button>}>
        <div className="space-y-3">
          <p className="flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-sm text-warning"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />This key will only be shown once. Store it securely.</p>
          <div className="break-all rounded-lg border border-line bg-subtle p-3 font-mono text-xs" data-testid="new-key">{secret}</div>
          {secret && <CopyButton value={secret} label="Copy key" />}
        </div>
      </Modal>

      <ConfirmModal open={!!revoke} onClose={() => setRevoke(null)} loading={del.isPending} danger confirmLabel="Revoke key" title="Revoke API key?"
        onConfirm={() => revoke && del.mutate(revoke.id)}
        message={<>Any integration using <b className="font-mono text-fg">{revoke?.prefix}…</b> will stop working immediately. This cannot be undone.</>} />
    </>
  );
}
