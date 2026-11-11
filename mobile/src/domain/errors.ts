export interface AppErrorDetails {
  code?: string;
  detail: string;
  status?: number;
  balance?: number;
  required?: number;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: string | undefined;
  readonly balance: number | undefined;
  readonly required: number | undefined;
  readonly status: number | undefined;

  constructor(details: AppErrorDetails) {
    super(details.detail, { cause: details.cause });
    this.name = 'AppError';
    this.code = details.code;
    this.balance = details.balance;
    this.required = details.required;
    this.status = details.status;
  }
}
