import type { LaundryService } from '../../domain/laundryService';
import type { Order } from '../../domain/order';
import type { Wallet } from '../../domain/wallet';

export interface LaundryGateway {
  getWallet(signal?: AbortSignal): Promise<Wallet>;
  listServices(signal?: AbortSignal): Promise<readonly LaundryService[]>;
  creditWallet(amount: number, idempotencyKey: string): Promise<Wallet>;
  createOrder(serviceId: number, idempotencyKey: string): Promise<Order>;
}
