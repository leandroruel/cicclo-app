import type { LaundryService } from '../../domain/laundryService';
import type { Order } from '../../domain/order';
import type { Wallet } from '../../domain/wallet';
import type { WalletTransaction } from '../../domain/walletTransaction';

export interface LaundryGateway {
  getWallet(signal?: AbortSignal): Promise<Wallet>;
  getWalletTransactions(signal?: AbortSignal): Promise<readonly WalletTransaction[]>;
  listServices(signal?: AbortSignal): Promise<readonly LaundryService[]>;
  creditWallet(amount: number, idempotencyKey: string): Promise<Wallet>;
  createOrder(serviceId: number, idempotencyKey: string): Promise<Order>;
}
