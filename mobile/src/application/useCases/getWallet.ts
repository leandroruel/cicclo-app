import type { LaundryGateway } from '../ports/LaundryGateway';

export function getWallet(gateway: LaundryGateway, signal?: AbortSignal) {
  return gateway.getWallet(signal);
}
