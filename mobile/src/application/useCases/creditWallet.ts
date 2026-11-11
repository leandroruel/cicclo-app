import type { LaundryGateway } from '../ports/LaundryGateway';

export interface CreditWalletInput {
  amount: number;
  idempotencyKey: string;
}

export function creditWallet(gateway: LaundryGateway, input: CreditWalletInput) {
  return gateway.creditWallet(input.amount, input.idempotencyKey);
}
