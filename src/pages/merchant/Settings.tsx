import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { api, ApiError } from '../../services/api';
import { Button, Card, CardHeader, Field, Input, PageHeader } from '../../components/ui';
import { useToast } from '../../lib/toast';
import { useAuth } from '../../lib/auth';
import { formatDate, formatDateTime } from '../../utils/format';

interface Profile { name: string; email: string; phone: string | null; businessName: string; upiId: string | null; upiVerified: boolean; upiUpdatedAt: string | null }

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  businessName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^(\+?[0-9]{10,15})?$/, 'Enter 10–15 digits'),
  upiId: z.string().trim().regex(/^([A-Za-z0-9._-]{2,64}@[A-Za-z][A-Za-z0-9]{1,32})?$/, 'Enter a valid UPI ID, e.g. name@bank'),
});
type Form = z.infer<typeof schema>;

export default function SettingsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const profile = useQuery({ queryKey: ['profile'], queryFn: () => api<Profile>('/api/v1/profile') });
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<Form>({ resolver: zodResolver(schema) });
  useEffect(() => { if (profile.data) reset({ name: profile.data.name, businessName: profile.data.businessName, phone: profile.data.phone ?? '', upiId: profile.data.upiId ?? '' }); }, [profile.data, reset]);

  const save = useMutation({
    mutationFn: (v: Form) => api<Profile>('/api/v1/profile', { method: 'PUT', body: { name: v.name, businessName: v.businessName, phone: v.phone || null, upiId: v.upiId || null } }),
    onSuccess: (p) => { qc.setQueryData(['profile'], p); qc.invalidateQueries({ queryKey: ['me'] }); toast('success', 'Settings saved'); },
    onError: (e) => toast('error', e instanceof ApiError ? e.message : 'Could not save'),
  });
  const p = profile.data;

  return (
    <>
      <PageHeader title="Settings" description="Your business profile, payout UPI and account security." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Profile & payout" />
          <form noValidate className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={handleSubmit((v) => save.mutate(v))}>
            <Field label="Name" error={errors.name?.message}><Input invalid={!!errors.name} {...register('name')} /></Field>
            <Field label="Business name" error={errors.businessName?.message}><Input invalid={!!errors.businessName} {...register('businessName')} /></Field>
            <Field label="Email" hint="Email can't be changed here."><Input value={p?.email ?? user?.email ?? ''} disabled readOnly /></Field>
            <Field label="Phone" error={errors.phone?.message}><Input type="tel" invalid={!!errors.phone} {...register('phone')} /></Field>
            <div className="sm:col-span-2">
              <Field label="UPI ID for withdrawals" error={errors.upiId?.message} hint="Basic format check only. Changing it pauses withdrawals for a short cooldown to protect your balance.">
                <Input placeholder="name@bank" autoComplete="off" invalid={!!errors.upiId} {...register('upiId')} />
              </Field>
              <p className="mt-2 text-xs text-muted">{p?.upiId ? <>Status: <b className="text-fg">Not verified</b> · ShreePay does not verify UPI ownership; the admin transfers to exactly what you enter.</> : 'No UPI ID saved yet.'}</p>
            </div>
            <div className="sm:col-span-2"><Button type="submit" loading={save.isPending} disabled={!isDirty}>Save changes</Button></div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Account & security" />
          <dl className="space-y-4 p-5 text-sm">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 text-success" /><div><dt className="font-medium">Session</dt><dd className="text-xs text-muted">HttpOnly cookie, expires automatically. Logging out ends it everywhere on this device.</dd></div></div>
            <div><dt className="text-xs text-muted">Member since</dt><dd>{formatDate(user?.createdAt)}</dd></div>
            <div><dt className="text-xs text-muted">UPI last changed</dt><dd>{p?.upiUpdatedAt ? formatDateTime(p.upiUpdatedAt) : '—'}</dd></div>
            <div><dt className="text-xs text-muted">Password</dt><dd className="text-xs text-muted">Use “Forgot password” on the sign-in page to set a new one; this signs out all sessions.</dd></div>
          </dl>
        </Card>
      </div>
    </>
  );
}
