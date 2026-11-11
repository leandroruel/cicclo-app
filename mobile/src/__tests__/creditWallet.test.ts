import { describe, expect, it, vi } from 'vitest';
import type { LaundryGateway } from '../application/ports/LaundryGateway';
import { creditWallet } from '../application/useCases/creditWallet';
import type { Wallet } from '../domain/wallet';

const wallet: Wallet = {
  id: '5b1f0c1e-7a34-4c53-9c0e-2f6f4a1d9a10',
  balance: 75,
  currency: 'BRL',
};

describe('creditWallet', () => {
  it('sends the selected amount and idempotency key to the gateway', async () => {
    const gatewayCredit = vi.fn(async () => wallet);
    const gateway: LaundryGateway = {
      getWallet: vi.fn(),
      getWalletTransactions: vi.fn(),
      listServices: vi.fn(),
      creditWallet: gatewayCredit,
      createOrder: vi.fn(),
    };
    const input = {
      amount: 25,
      idempotencyKey: '60c41438-57da-49e3-8652-50fe873e05d8',
    };

    await expect(creditWallet(gateway, input)).resolves.toEqual(wallet);
    expect(gatewayCredit).toHaveBeenCalledExactlyOnceWith(
      input.amount,
      input.idempotencyKey,
    );
  });
});
