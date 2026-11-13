import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import { GuestOnly, RequireAdmin, RequireMerchant } from './routes/guards';
import { Skeleton } from './components/ui';

import { ForgotPassword, Login, Register, ResetPassword, VerifyEmail } from './pages/auth/AuthPages';
import Overview from './pages/merchant/Overview';
import Payments from './pages/merchant/Payments';
import Transactions from './pages/merchant/Transactions';
import Withdrawals from './pages/merchant/Withdrawals';
import ApiKeys from './pages/merchant/ApiKeys';
import SettingsPage from './pages/merchant/Settings';
import AdminOverview from './pages/admin/Overview';
import AdminMerchants, { MerchantDetail } from './pages/admin/Merchants';
import { AdminPayments, AdminWithdrawals, AdminApiKeys, AdminSecurity, AdminApiLogs, AdminAuditLogs, AdminSettings } from './pages/admin/Lists';

// Heavier pages are code-split.
const Docs = lazy(() => import('./pages/merchant/Docs'));
const AnalyticsPage = lazy(() => import('./pages/merchant/Analytics'));

const Fallback = () => <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

export default function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<Login admin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        <Route element={<RequireMerchant />}>
          <Route path="/dashboard" element={<AppLayout variant="merchant" />}>
            <Route index element={<Overview />} />
            <Route path="payments" element={<Payments />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="withdrawals" element={<Withdrawals />} />
            <Route path="api-keys" element={<ApiKeys />} />
            <Route path="docs" element={<Docs />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AppLayout variant="admin" />}>
            <Route index element={<AdminOverview />} />
            <Route path="merchants" element={<AdminMerchants />} />
            <Route path="merchants/:id" element={<MerchantDetail />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="withdrawals" element={<AdminWithdrawals />} />
            <Route path="api-keys" element={<AdminApiKeys />} />
            <Route path="security" element={<AdminSecurity />} />
            <Route path="api-logs" element={<AdminApiLogs />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
