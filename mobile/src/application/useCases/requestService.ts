import type { LaundryGateway } from '../ports/LaundryGateway';

export interface RequestServiceInput {
  serviceId: number;
  idempotencyKey: string;
}

export function requestService(
  gateway: LaundryGateway,
  input: RequestServiceInput,
) {
  return gateway.createOrder(input.serviceId, input.idempotencyKey);
}
