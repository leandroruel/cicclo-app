import type { LaundryGateway } from '../ports/LaundryGateway';

export function listWalletTransactions(gateway: LaundryGateway, signal?: AbortSignal) {
  return gateway.getWalletTransactions(signal);
}
