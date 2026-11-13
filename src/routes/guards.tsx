import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Skeleton } from '../components/ui';

const Splash = () => (
  <div className="grid min-h-screen place-items-center"><div className="w-64 space-y-3"><Skeleton className="h-8 w-40" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div></div>
);

/** UI-level route guards only. The backend independently enforces every permission. */
export function RequireMerchant() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  return <Outlet />;
}

export function RequireAdmin() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function GuestOnly() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />;
  return <Outlet />;
}
