import { AppError } from '../../domain/errors';
import { getApiBaseUrl } from '../config/env';

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export async function requestJson(
  path: string,
  options: RequestOptions = {},
): Promise<unknown> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  Object.assign(headers, options.headers);

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });
  const responseText = await response.text();

  let payload: unknown;
  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch (error) {
      if (response.ok) {
        throw new Error('A API retornou uma resposta JSON inválida.', {
          cause: error,
        });
      }
      throw new AppError({
        status: response.status,
        detail: `A API retornou um erro inválido (HTTP ${response.status}).`,
        cause: error,
      });
    }
  }

  if (!response.ok) {
    const problem = isRecord(payload) ? payload : {};
    throw new AppError({
      status: response.status,
      code: typeof problem.code === 'string' ? problem.code : undefined,
      detail:
        typeof problem.detail === 'string'
          ? problem.detail
          : `A solicitação falhou (HTTP ${response.status}).`,
      balance: optionalNumber(problem.balance),
      required: optionalNumber(problem.required),
    });
  }

  if (payload === undefined) {
    throw new Error('A API retornou uma resposta vazia quando JSON era esperado.');
  }

  return payload;
}
