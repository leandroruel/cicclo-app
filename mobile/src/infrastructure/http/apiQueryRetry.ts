import { AppError } from '../../domain/errors';

const MAX_API_RETRIES = 15;
const MAX_RETRY_DELAY_MS = 5000;

export function shouldRetryApiRequest(failureCount: number, error: Error): boolean {
  if (failureCount >= MAX_API_RETRIES) return false;
  if (error instanceof TypeError) return true;

  return (
    error instanceof AppError &&
    (error.status === 408 ||
      error.status === 429 ||
      error.status === 502 ||
      error.status === 503 ||
      error.status === 504 ||
      (error.status !== undefined && error.status >= 500))
  );
}

export function getApiRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, MAX_RETRY_DELAY_MS);
}
