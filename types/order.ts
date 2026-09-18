export interface OrderItem {
  dishId: string;
  name: string;
  finalPrice: number;
  quantity: number;
  subtotal: number;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  notes?: string;
}

export type OrderStatus = 'PENDING_DELIVERY' | 'CONFIRMED' | 'DELIVERED';

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  customer: CustomerInfo;
  status: OrderStatus;
  createdAt: number;
  updatedAt?: number;
  orderNumber: string;
  isSimulated: boolean;
}

export interface IOrderService {
  createOrder(items: OrderItem[], customer: CustomerInfo, total: number): Promise<Order>;
  getOrders(): Promise<Order[]>;
  getOrderById(orderId: string): Promise<Order | null>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order>;
}
