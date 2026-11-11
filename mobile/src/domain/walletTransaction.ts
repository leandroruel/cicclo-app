export interface WalletTransaction {
  id: string;
  type: 'Credit' | 'Debit';
  amount: number;
  balanceAfter: number;
  orderId: string | null;
  createdAt: string;
}
