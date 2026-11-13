export type Role = 'USER' | 'ADMIN';
export interface Me {
  id: string; name: string; email: string; phone: string | null; role: Role; status: string; emailVerified: boolean; createdAt: string;
  profile: { businessName: string; upiId: string | null; upiVerified: boolean; upiUpdatedAt: string | null } | null;
}
export interface Balance {
  available: number; reserved: number; totalReceived: number; totalWithdrawn: number; currency: string; minWithdrawal: number;
  recentLedger: { id: string; type: string; amount: number; balanceAfter: number; description: string; createdAt: string }[];
}
export type OrderStatus = 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
export interface PaymentOrder {
  orderId: string; amount: number; amountPaise: number; currency: string; status: OrderStatus;
  paymentUrl: string | null; createdAt: string; expiresAt: string; verifiedAt: string | null;
}
export interface Tx {
  id: string; orderId?: string; externalTransactionId: string | null; amount: number; status: string; upstreamStatus: string | null;
  verifiedAt: string | null; createdAt: string; merchant?: string; merchantEmail?: string;
}
export type WithdrawalStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'CANCELLED';
export interface Withdrawal {
  id: string; amount: number; upiId: string; status: WithdrawalStatus; adminNote: string | null; requestedAt: string;
  processedAt: string | null; paidAt: string | null; rejectedAt: string | null; cancelledAt: string | null;
  merchant?: string; merchantEmail?: string; userId?: string;
}
export interface ApiKeyRow {
  id: string; name: string; prefix: string; status: 'ACTIVE' | 'REVOKED'; lastUsedAt: string | null; createdAt: string;
  merchant?: string; merchantEmail?: string;
}
export interface Analytics {
  series: { day: string; created: number; verified: number; revenue: number; successRate: number }[];
  totals: { created: number; verified: number; revenue: number; successRate: number };
}
