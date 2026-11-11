import { describe, expect, it, vi } from 'vitest';
import type { LaundryGateway } from '../application/ports/LaundryGateway';
import { requestService } from '../application/useCases/requestService';
import type { Order } from '../domain/order';

const order: Order = {
  id: '60c41438-57da-49e3-8652-50fe873e05d8',
  serviceId: 1,
  serviceName: 'Lavagem',
  price: 18.9,
  currency: 'BRL',
  status: 'Confirmed',
  createdAt: '2026-01-01T10:00:00Z',
  walletBalance: 31.1,
};

describe('requestService', () => {
  it('sends the selected service and idempotency key to the gateway', async () => {
    const createOrder = vi.fn(async () => order);
    const gateway: LaundryGateway = {
      getWallet: vi.fn(),
      getWalletTransactions: vi.fn(),
      listServices: vi.fn(),
      creditWallet: vi.fn(),
      createOrder,
    };
    const input = {
      serviceId: order.serviceId,
      idempotencyKey: '60c41438-57da-49e3-8652-50fe873e05d8',
    };

    await expect(requestService(gateway, input)).resolves.toEqual(order);
    expect(createOrder).toHaveBeenCalledExactlyOnceWith(
      input.serviceId,
      input.idempotencyKey,
    );
  });

  it('preserves gateway errors for the presentation to handle', async () => {
    const error = new Error('Insufficient balance');
    const gateway: LaundryGateway = {
      getWallet: vi.fn(),
      getWalletTransactions: vi.fn(),
      listServices: vi.fn(),
      creditWallet: vi.fn(),
      createOrder: vi.fn(async () => {
        throw error;
      }),
    };

    await expect(
      requestService(gateway, {
        serviceId: 1,
        idempotencyKey: '60c41438-57da-49e3-8652-50fe873e05d8',
      }),
    ).rejects.toBe(error);
  });
});
