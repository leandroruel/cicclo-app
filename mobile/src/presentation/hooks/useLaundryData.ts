import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getWallet } from '../../application/useCases/getWallet';
import { listServices } from '../../application/useCases/listServices';
import { requestService } from '../../application/useCases/requestService';
import { laundryGateway } from '../../di/container';

export const walletQueryKey = ['wallet'] as const;
export const servicesQueryKey = ['services'] as const;
export const ordersQueryKey = ['orders'] as const;

export function useWallet() {
  return useQuery({
    queryKey: walletQueryKey,
    queryFn: ({ signal }) => getWallet(laundryGateway, signal),
  });
}

export function useServices() {
  return useQuery({
    queryKey: servicesQueryKey,
    queryFn: ({ signal }) => listServices(laundryGateway, signal),
  });
}

export function useRequestService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { serviceId: number; idempotencyKey: string }) =>
      requestService(laundryGateway, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: walletQueryKey }),
        queryClient.invalidateQueries({ queryKey: ordersQueryKey }),
      ]);
    },
  });
}
