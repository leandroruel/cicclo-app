import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { creditWallet } from '../../application/useCases/creditWallet';
import { getWallet } from '../../application/useCases/getWallet';
import { listServices } from '../../application/useCases/listServices';
import { listWalletTransactions } from '../../application/useCases/listWalletTransactions';
import { requestService } from '../../application/useCases/requestService';
import { laundryGateway } from '../../di/container';
import {
  getApiRetryDelay,
  shouldRetryApiRequest,
} from '../../infrastructure/http/apiQueryRetry';

export const walletQueryKey = ['wallet'] as const;
export const servicesQueryKey = ['services'] as const;
export const ordersQueryKey = ['orders'] as const;
export const walletTransactionsQueryKey = ['wallet', 'transactions'] as const;

export function useWallet() {
  return useQuery({
    queryKey: walletQueryKey,
    queryFn: ({ signal }) => getWallet(laundryGateway, signal),
    retry: shouldRetryApiRequest,
    retryDelay: getApiRetryDelay,
  });
}

export function useServices() {
  return useQuery({
    queryKey: servicesQueryKey,
    queryFn: ({ signal }) => listServices(laundryGateway, signal),
    retry: shouldRetryApiRequest,
    retryDelay: getApiRetryDelay,
  });
}

export function useWalletTransactions(enabled = true) {
  return useQuery({
    queryKey: walletTransactionsQueryKey,
    queryFn: ({ signal }) => listWalletTransactions(laundryGateway, signal),
    enabled,
    retry: shouldRetryApiRequest,
    retryDelay: getApiRetryDelay,
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
        queryClient.invalidateQueries({ queryKey: walletTransactionsQueryKey }),
      ]);
    },
  });
}

export function useCreditWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { amount: number; idempotencyKey: string }) =>
      creditWallet(laundryGateway, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: walletQueryKey });
      await queryClient.invalidateQueries({ queryKey: walletTransactionsQueryKey });
    },
  });
}
