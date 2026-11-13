import { forwardRef, useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BadgeCheck, Eye, EyeOff, Gauge, KeyRound, Landmark, Mail, ShieldCheck } from 'lucide-react';
import { Button, Field, Input } from '../../components/ui';
import { Logo } from '../../layouts/AppLayout';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { ApiError } from '../../services/api';
import { cn } from '../../lib/utils';

function Shell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex" style={{ background: 'linear-gradient(145deg,#0b3b37 0%,#0f766e 55%,#14b8a6 120%)' }}>
        <div className="pointer-events-none absolute inset-0 opacity-[0.18]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '26px 26px' }} />
        <div className="pointer-events-none absolute -bottom-32 -right-24 h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center gap-2.5 text-lg font-semibold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur"><Landmark className="h-5 w-5" /></span>ShreePay</div>
        <div className="relative max-w-md space-y-8">
          <h2 className="text-[2.1rem] font-semibold leading-[1.15] tracking-tight">Accept payments.<br />Verify instantly.<br />Settle with confidence.</h2>
          <ul className="space-y-4 text-sm text-white/90">
            <li className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />Every payment is verified on our servers before your balance moves.</li>
            <li className="flex gap-3"><KeyRound className="mt-0.5 h-5 w-5 shrink-0" />Simple REST API with secure keys, idempotency and usage analytics.</li>
            <li className="flex gap-3"><Gauge className="mt-0.5 h-5 w-5 shrink-0" />A real ledger: available, reserved and withdrawn, always reconciled.</li>
          </ul>
        </div>
        <p className="relative text-xs text-white/60">Withdrawals are reviewed and paid manually, with a full audit trail.</p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px] animate-fade-in">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="text-[1.65rem] font-semibold tracking-tight">{title}</h1>
          <p className="mb-7 mt-1.5 text-sm text-muted">{subtitle}</p>
          {children}
          {footer && <div className="mt-7 text-center text-sm text-muted">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong');

// forwardRef is required: react-hook-form's register() hands us a ref, and without forwarding it the field is never registered ("Required" error).
const PasswordInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(function PasswordInput({ invalid, ...rest }, ref) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={show ? 'text' : 'password'} invalid={invalid} className="pr-10" {...rest} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-fg">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});

/* ---------------- Login ---------------- */
const loginSchema = z.object({ email: z.string().email('Enter a valid email'), password: z.string().min(1, 'Enter your password') });

export function Login({ admin }: { admin?: boolean }) {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  const submit = handleSubmit(async (v) => {
    setError('');
    try {
      const u = await login(v.email, v.password);
      if (admin && u.role !== 'ADMIN') { setError('This is the admin sign-in. Use the merchant login instead.'); return; }
      nav(u.role === 'ADMIN' ? '/admin' : (loc.state as { from?: string } | null)?.from ?? '/dashboard', { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'EMAIL_NOT_VERIFIED') {
        toast('info', 'Please verify your email first. We sent you a new code.');
        nav('/verify-email', { state: { email: v.email.toLowerCase(), emailSent: true, resendAfter: 60 } });
        return;
      }
      setError(errMsg(e));
      if (e instanceof ApiError && e.status === 429) toast('error', 'Too many attempts. Please wait before trying again.');
    }
  });

  return (
    <Shell title={admin ? 'Admin sign in' : 'Welcome back'} subtitle={admin ? 'Restricted area for ShreePay administrators.' : 'Sign in to your merchant dashboard.'}
      footer={admin ? <Link className="text-primary hover:underline" to="/login">Merchant login</Link> : <>New to ShreePay? <Link className="font-medium text-primary hover:underline" to="/register">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} /></Field>
        <Field label="Password" error={errors.password?.message}><PasswordInput autoComplete="current-password" invalid={!!errors.password} {...register('password')} /></Field>
        {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <Button type="submit" className="h-11 w-full" loading={isSubmitting}>Sign in</Button>
        {!admin && <div className="text-right"><Link to="/forgot-password" className="text-xs text-muted hover:text-fg">Forgot password?</Link></div>}
      </form>
    </Shell>
  );
}

/* ---------------- Register ---------------- */
const pw = z.string().min(10, 'At least 10 characters').max(128).regex(/[a-z]/, 'Add a lowercase letter').regex(/[A-Z]/, 'Add an uppercase letter').regex(/[0-9]/, 'Add a digit');
const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  businessName: z.string().trim().min(2, 'Enter your business name').max(100),
  email: z.string().email('Enter a valid email'),
  phone: z.string().trim().regex(/^(\+?[0-9]{10,15})?$/, 'Enter 10–15 digits').optional(),
  password: pw,
});

function strength(p: string) {
  let s = 0;
  if (p.length >= 10) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 14) s++;
  return s;
}

export function Register() {
  const { register: signUp } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });
  const score = strength(watch('password') ?? '');

  const submit = handleSubmit(async (v) => {
    setError('');
    try {
      const r = await signUp({ ...v, phone: v.phone || undefined });
      nav('/verify-email', { state: { email: r.email, emailSent: r.emailSent, resendAfter: r.resendAfter } });
    } catch (e) { setError(errMsg(e)); }
  });

  return (
    <Shell title="Create your account" subtitle="Start accepting verified payments in minutes."
      footer={<>Already registered? <Link className="font-medium text-primary hover:underline" to="/login">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-3.5" noValidate>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Your name" error={errors.name?.message}><Input autoComplete="name" invalid={!!errors.name} {...register('name')} /></Field>
          <Field label="Business name" error={errors.businessName?.message}><Input autoComplete="organization" invalid={!!errors.businessName} {...register('businessName')} /></Field>
        </div>
        <Field label="Email" error={errors.email?.message} hint="We'll send a 6-digit code to verify it."><Input type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} /></Field>
        <Field label="Phone (optional)" error={errors.phone?.message}><Input type="tel" autoComplete="tel" invalid={!!errors.phone} {...register('phone')} /></Field>
        <Field label="Password" error={errors.password?.message} hint="10+ characters with upper, lower case and a digit.">
          <PasswordInput autoComplete="new-password" invalid={!!errors.password} {...register('password')} />
        </Field>
        <div className="flex gap-1" aria-hidden>{[1, 2, 3, 4].map((i) => <span key={i} className={cn('h-1 flex-1 rounded-full bg-line transition-colors', score >= i && (score <= 1 ? 'bg-danger' : score === 2 ? 'bg-warning' : 'bg-success'))} />)}</div>
        {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <Button type="submit" className="h-11 w-full" loading={isSubmitting}>Create account</Button>
      </form>
    </Shell>
  );
}

/* ---------------- Email OTP ---------------- */
const LEN = 6;

export function VerifyEmail() {
  const loc = useLocation();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { verifyEmail, resendOtp } = useAuth();
  const { toast } = useToast();
  const st = loc.state as { email?: string; emailSent?: boolean; resendAfter?: number } | null;
  const email = st?.email ?? params.get('email') ?? '';

  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(''));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(st?.resendAfter ?? 60);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  useEffect(() => { if (st?.emailSent === false) setError("We couldn't send the email. Press “Resend code” once the timer ends."); }, [st?.emailSent]);

  const submit = async (code: string) => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await verifyEmail(email, code);
      toast('success', 'Email verified. Welcome to ShreePay!');
      nav('/dashboard', { replace: true });
    } catch (e) {
      setError(errMsg(e));
      setDigits(Array(LEN).fill(''));
      refs.current[0]?.focus();
    } finally { setBusy(false); }
  };

  const setAt = (i: number, v: string) => {
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (next.every((d) => d !== '')) void submit(next.join(''));
  };
  const onChange = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, '').slice(-1);
    setAt(i, d);
    if (d && i < LEN - 1) refs.current[i + 1]?.focus();
  };
  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < LEN - 1) refs.current[i + 1]?.focus();
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LEN);
    if (!t) return;
    e.preventDefault();
    const next = Array.from({ length: LEN }, (_, i) => t[i] ?? '');
    setDigits(next);
    refs.current[Math.min(t.length, LEN - 1)]?.focus();
    if (t.length === LEN) void submit(t);
  };

  const resend = async () => {
    try { await resendOtp(email); setCooldown(60); setError(''); toast('success', 'A new code is on its way'); }
    catch (e) { toast('error', errMsg(e)); }
  };

  if (!email) {
    return <Shell title="Verify your email" subtitle="Start by creating an account." footer={<Link className="text-primary hover:underline" to="/register">Create account</Link>}><span /></Shell>;
  }

  return (
    <Shell title="Check your email" subtitle={`We sent a 6-digit code to ${email}. It expires in 10 minutes.`}
      footer={<>Wrong email? <Link className="font-medium text-primary hover:underline" to="/register">Start over</Link></>}>
      <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Mail className="h-6 w-6" /></div>
      <div className="flex justify-between gap-2" role="group" aria-label="Verification code">
        {digits.map((d, i) => (
          <input key={i} ref={(el) => (refs.current[i] = el)} value={d} inputMode="numeric" pattern="[0-9]*" maxLength={1} disabled={busy}
            autoComplete={i === 0 ? 'one-time-code' : 'off'} aria-label={`Digit ${i + 1}`}
            onChange={(e) => onChange(i, e.target.value)} onKeyDown={(e) => onKeyDown(i, e)} onPaste={onPaste} onFocus={(e) => e.target.select()}
            className={cn('h-14 w-full min-w-0 rounded-xl border border-line bg-card text-center text-xl font-semibold transition focus:border-primary disabled:opacity-60', error && 'border-danger')} />
        ))}
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <Button className="mt-6 h-11 w-full" loading={busy} disabled={digits.some((d) => !d)} onClick={() => submit(digits.join(''))}><BadgeCheck className="h-4 w-4" />Verify and continue</Button>
      <p className="mt-5 text-center text-sm text-muted">
        Didn't get it?{' '}
        {cooldown > 0
          ? <span>Resend in <b className="num text-fg">{cooldown}s</b></span>
          : <button className="font-medium text-primary hover:underline" onClick={resend}>Resend code</button>}
      </p>
      <p className="mt-2 text-center text-xs text-muted">Check your spam folder too.</p>
    </Shell>
  );
}

/* ---------------- Forgot / reset ---------------- */
export function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string }>({ resolver: zodResolver(z.object({ email: z.string().email('Enter a valid email') })) });
  const submit = handleSubmit(async (v) => {
    const { api } = await import('../../services/api');
    await api('/auth/forgot-password', { method: 'POST', body: v }).catch(() => undefined);
    setSent(true);
  });
  return (
    <Shell title="Reset your password" subtitle="We'll email you a link that works for 30 minutes." footer={<Link className="text-primary hover:underline" to="/login">Back to sign in</Link>}>
      {sent ? (
        <p className="rounded-lg bg-success/10 px-3 py-3 text-sm text-success">If that email is registered, a reset link is on its way.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} /></Field>
          <Button type="submit" className="h-11 w-full" loading={isSubmitting}>Send reset link</Button>
        </form>
      )}
    </Shell>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState('');
  const token = params.get('token') ?? '';
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ password: string }>({ resolver: zodResolver(z.object({ password: pw })) });
  const submit = handleSubmit(async (v) => {
    setError('');
    try {
      const { api } = await import('../../services/api');
      await api('/auth/reset-password', { method: 'POST', body: { token, password: v.password } });
      toast('success', 'Password updated. Please sign in.');
      nav('/login', { replace: true });
    } catch (e) { setError(errMsg(e)); }
  });
  return (
    <Shell title="Choose a new password" subtitle="You'll be signed out of all other devices." footer={<Link className="text-primary hover:underline" to="/login">Back to sign in</Link>}>
      {!token ? <p className="text-sm text-danger">This reset link is missing its token.</p> : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="New password" error={errors.password?.message}><PasswordInput autoComplete="new-password" invalid={!!errors.password} {...register('password')} /></Field>
          {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <Button type="submit" className="h-11 w-full" loading={isSubmitting}>Update password</Button>
        </form>
      )}
    </Shell>
  );
}
