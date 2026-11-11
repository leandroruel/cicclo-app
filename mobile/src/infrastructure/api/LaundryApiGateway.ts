import type { LaundryGateway } from '../../application/ports/LaundryGateway';
import type { LaundryService } from '../../domain/laundryService';
import type { Order } from '../../domain/order';
import type { Wallet } from '../../domain/wallet';
import type { WalletTransaction } from '../../domain/walletTransaction';
import { requestJson } from '../http/httpClient';

function isWallet(value: unknown): value is Wallet {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'balance' in value &&
    typeof value.balance === 'number' &&
    'currency' in value &&
    typeof value.currency === 'string'
  );
}

function isLaundryService(value: unknown): value is LaundryService {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'number' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'price' in value &&
    typeof value.price === 'number' &&
    'currency' in value &&
    typeof value.currency === 'string'
  );
}

function isOrder(value: unknown): value is Order {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'serviceId' in value &&
    typeof value.serviceId === 'number' &&
    'serviceName' in value &&
    typeof value.serviceName === 'string' &&
    'price' in value &&
    typeof value.price === 'number' &&
    'currency' in value &&
    typeof value.currency === 'string' &&
    'status' in value &&
    typeof value.status === 'string' &&
    'createdAt' in value &&
    typeof value.createdAt === 'string' &&
    'walletBalance' in value &&
    typeof value.walletBalance === 'number'
  );
}

function isWalletTransaction(value: unknown): value is WalletTransaction {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'type' in value &&
    (value.type === 'Credit' || value.type === 'Debit') &&
    'amount' in value &&
    typeof value.amount === 'number' &&
    'balanceAfter' in value &&
    typeof value.balanceAfter === 'number' &&
    'orderId' in value &&
    (typeof value.orderId === 'string' || value.orderId === null) &&
    'createdAt' in value &&
    typeof value.createdAt === 'string'
  );
}

export class LaundryApiGateway implements LaundryGateway {
  async getWallet(signal?: AbortSignal): Promise<Wallet> {
    const response = await requestJson('/api/v1/wallet', { signal });
    if (!isWallet(response)) {
      throw new Error('A API retornou dados inválidos para a carteira.');
    }

    return response;
  }

  async listServices(signal?: AbortSignal): Promise<readonly LaundryService[]> {
    const response = await requestJson('/api/v1/services', { signal });
    if (
      typeof response !== 'object' ||
      response === null ||
      !('items' in response) ||
      !Array.isArray(response.items) ||
      !response.items.every(isLaundryService)
    ) {
      throw new Error('A API retornou dados inválidos para os serviços.');
    }

    return response.items;
  }

  async getWalletTransactions(
    signal?: AbortSignal,
  ): Promise<readonly WalletTransaction[]> {
    const response = await requestJson('/api/v1/wallet/transactions', { signal });
    if (
      typeof response !== 'object' ||
      response === null ||
      !('items' in response) ||
      !Array.isArray(response.items) ||
      !response.items.every(isWalletTransaction)
    ) {
      throw new Error('A API retornou dados inválidos para o histórico da carteira.');
    }

    return response.items;
  }

  async creditWallet(amount: number, idempotencyKey: string): Promise<Wallet> {
    const response = await requestJson('/api/v1/wallet/credits', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: { amount },
    });
    if (!isWallet(response)) {
      throw new Error('A API retornou dados inválidos para o crédito da carteira.');
    }

    return response;
  }

  async createOrder(
    serviceId: number,
    idempotencyKey: string,
  ): Promise<Order> {
    const response = await requestJson('/api/v1/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: { serviceId },
    });
    if (!isOrder(response)) {
      throw new Error('A API retornou dados inválidos para o pedido.');
    }

    return response;
  }
}
