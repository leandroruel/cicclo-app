import { describe, expect, it } from 'vitest';
import { AppError } from '../domain/errors';
import {
  getApiRetryDelay,
  shouldRetryApiRequest,
} from '../infrastructure/http/apiQueryRetry';

describe('API query retry policy', () => {
  it('retries network errors while the API is starting', () => {
    expect(shouldRetryApiRequest(0, new TypeError('Network request failed'))).toBe(true);
  });

  it.each([408, 429, 500, 502, 503, 504])(
    'retries temporary HTTP status %i',
    (status) => {
      expect(
        shouldRetryApiRequest(
          0,
          new AppError({ status, detail: 'Temporary API error' }),
        ),
      ).toBe(true);
    },
  );

  it('does not retry client errors or configuration errors', () => {
    expect(
      shouldRetryApiRequest(
        0,
        new AppError({ status: 404, detail: 'Not found' }),
      ),
    ).toBe(false);
    expect(shouldRetryApiRequest(0, new Error('API URL missing'))).toBe(false);
  });

  it('stops retrying after the configured retry limit', () => {
    expect(
      shouldRetryApiRequest(15, new TypeError('Network request failed')),
    ).toBe(false);
  });

  it('backs off exponentially and caps the wait at five seconds', () => {
    expect([0, 1, 2, 3, 4, 5].map(getApiRetryDelay)).toEqual([
      1000, 2000, 4000, 5000, 5000, 5000,
    ]);
  });
});
