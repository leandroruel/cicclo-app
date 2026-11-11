export interface Order {
  id: string;
  serviceId: number;
  serviceName: string;
  price: number;
  currency: string;
  status: string;
  createdAt: string;
  walletBalance: number;
}
