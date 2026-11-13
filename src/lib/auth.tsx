import { createContext, useContext, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../services/api';
import type { Me } from '../types';

export interface PendingSignup { email: string; emailSent: boolean; resendAfter: number }

interface AuthCtx {
  user: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Me>;
  /** Creates the account and emails a code. The user is NOT signed in until the code is verified. */
  register: (b: { name: string; email: string; password: string; phone?: string; businessName: string }) => Promise<PendingSignup>;
  verifyEmail: (email: string, code: string) => Promise<Me>;
  resendOtp: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}
const Ctx = createContext<AuthCtx>(null as never);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ['me'],
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      try {
        return (await api<{ user: Me }>('/auth/me')).user;
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return null;
        throw e;
      }
    },
  });
  const loginM = useMutation({ mutationFn: (v: { email: string; password: string }) => api<{ user: Me }>('/auth/login', { method: 'POST', body: v }) });
  const registerM = useMutation({ mutationFn: (v: object) => api<{ email: string; emailSent: boolean; resendAfter: number }>('/auth/register', { method: 'POST', body: v }) });
  const verifyM = useMutation({ mutationFn: (v: { email: string; code: string }) => api<{ user: Me }>('/auth/verify-email', { method: 'POST', body: v }) });

  const value: AuthCtx = {
    user: me.data ?? null,
    loading: me.isLoading,
    login: async (email, password) => {
      const { user } = await loginM.mutateAsync({ email, password });
      qc.clear();
      qc.setQueryData(['me'], user);
      return user;
    },
    register: async (b) => registerM.mutateAsync(b),
    verifyEmail: async (email, code) => {
      const { user } = await verifyM.mutateAsync({ email, code });
      qc.clear();
      qc.setQueryData(['me'], user);
      return user;
    },
    resendOtp: async (email) => {
      await api('/auth/resend-otp', { method: 'POST', body: { email } });
    },
    logout: async () => {
      await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
      qc.clear(); // drop every cached merchant/admin dataset
      qc.setQueryData(['me'], null);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
