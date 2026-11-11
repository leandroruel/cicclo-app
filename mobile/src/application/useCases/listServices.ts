import type { LaundryGateway } from '../ports/LaundryGateway';

export function listServices(gateway: LaundryGateway, signal?: AbortSignal) {
  return gateway.listServices(signal);
}
