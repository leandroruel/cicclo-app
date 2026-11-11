import { afterEach, describe, expect, it, vi } from 'vitest';
import { LaundryApiGateway } from '../infrastructure/api/LaundryApiGateway';

const idempotencyKey = '60c41438-57da-49e3-8652-50fe873e05d8';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('LaundryApiGateway', () => {
  it('sends an idempotency key and service ID when creating an order', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://api.cicclo.test/');
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: idempotencyKey,
          serviceId: 1,
          serviceName: 'Lavagem',
          price: 18.9,
          currency: 'BRL',
          status: 'Confirmed',
          createdAt: '2026-01-01T10:00:00Z',
          walletBalance: 31.1,
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await new LaundryApiGateway().createOrder(1, idempotencyKey);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.cicclo.test/api/v1/orders',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Idempotency-Key': idempotencyKey,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ serviceId: 1 }),
      }),
    );
  });

  it('sends an idempotent wallet credit request and returns the credited wallet', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://api.cicclo.test/');
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: '5b1f0c1e-7a34-4c53-9c0e-2f6f4a1d9a10',
          balance: 75,
          currency: 'BRL',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const wallet = await new LaundryApiGateway().creditWallet(25, idempotencyKey);

    expect(wallet).toEqual({
      id: '5b1f0c1e-7a34-4c53-9c0e-2f6f4a1d9a10',
      balance: 75,
      currency: 'BRL',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.cicclo.test/api/v1/wallet/credits',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Idempotency-Key': idempotencyKey,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ amount: 25 }),
      }),
    );
  });

  it('maps API problem details into a typed application error', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://api.cicclo.test');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            status: 422,
            code: 'insufficient_balance',
            detail: 'Saldo insuficiente.',
            balance: 5,
            required: 18.9,
          }),
          { status: 422, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    await expect(new LaundryApiGateway().createOrder(1, idempotencyKey)).rejects
      .toMatchObject({
        name: 'AppError',
        status: 422,
        code: 'insufficient_balance',
        balance: 5,
        required: 18.9,
      });
  });
});
