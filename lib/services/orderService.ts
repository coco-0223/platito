import { Order, OrderItem, CustomerInfo, OrderStatus, IOrderService } from '@/types/order';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy
} from 'firebase/firestore';

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord_seed_1',
    orderNumber: 'PLT-784210',
    items: [
      {
        dishId: 'dish_seed_1',
        name: 'Milanesa a la Napolitana con Fritas',
        finalPrice: 6600,
        quantity: 1,
        subtotal: 6600,
      },
      {
        dishId: 'dish_seed_5',
        name: 'Flan Casero Mixto',
        finalPrice: 2880,
        quantity: 1,
        subtotal: 2880,
      },
    ],
    total: 9480,
    customer: {
      name: 'Camila Rodriguez',
      phone: '+54 9 11 4433-2211',
      address: 'Av. Santa Fe 3245, Piso 4 Depto B',
      notes: 'Tocar timbre 4B. Portero eléctrico averiado.',
    },
    status: 'PENDING_DELIVERY',
    isSimulated: true,
    createdAt: 1726507000000,
  },
];

export class OrderService implements IOrderService {
  private inMemoryOrders: Map<string, Order> = new Map();
  private storageKey = 'platito_orders';

  constructor() {
    this.initializeStorage();
  }

  private initializeStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const parsed: Order[] = JSON.parse(stored);
          parsed.forEach((order) => this.inMemoryOrders.set(order.id, order));
          return;
        }
      } catch (err) {
        console.warn('Could not read orders from localStorage:', err);
      }
    }
    INITIAL_ORDERS.forEach((order) => this.inMemoryOrders.set(order.id, { ...order }));
    this.persistToLocalStorage();
  }

  private persistToLocalStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const ordersArray = Array.from(this.inMemoryOrders.values());
        localStorage.setItem(this.storageKey, JSON.stringify(ordersArray));
      } catch (err) {
        console.warn('Could not persist orders to localStorage:', err);
      }
    }
  }

  clearAll(): void {
    this.inMemoryOrders.clear();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(this.storageKey);
      } catch (err) {
        console.warn('Could not clear orders in localStorage:', err);
      }
    }
  }

  async createOrder(items: OrderItem[], customer: CustomerInfo, total: number): Promise<Order> {
    if (!items || items.length === 0) {
      throw new Error('El pedido debe incluir al menos un plato.');
    }
    if (!customer.name || !customer.phone || !customer.address) {
      throw new Error('Los datos de contacto (nombre, teléfono y dirección) son obligatorios.');
    }
    if (total <= 0) {
      throw new Error('El monto total del pedido debe ser superior a 0.');
    }

    const now = Date.now();
    const orderNumber = `PLT-${Math.floor(100000 + Math.random() * 900000)}`;

    if (isFirebaseConfigured() && db) {
      const ordersCol = collection(db, 'orders');
      const newDocRef = doc(ordersCol);
      const newOrder: Order = {
        id: newDocRef.id,
        items,
        customer,
        total,
        status: 'PENDING_DELIVERY',
        orderNumber,
        isSimulated: true,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(newDocRef, newOrder);
      return newOrder;
    }

    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newOrder: Order = {
      id: orderId,
      items,
      customer,
      total,
      status: 'PENDING_DELIVERY',
      orderNumber,
      isSimulated: true,
      createdAt: now,
      updatedAt: now,
    };
    this.inMemoryOrders.set(orderId, newOrder);
    this.persistToLocalStorage();
    return newOrder;
  }

  async getOrders(): Promise<Order[]> {
    if (isFirebaseConfigured() && db) {
      try {
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const orders: Order[] = [];
        snapshot.forEach((doc) => orders.push(doc.data() as Order));
        return orders;
      } catch (error) {
        console.warn('Firestore getOrders failed, falling back to in-memory:', error);
      }
    }

    return Array.from(this.inMemoryOrders.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  async getOrderById(orderId: string): Promise<Order | null> {
    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, 'orders', orderId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          return snapshot.data() as Order;
        }
        return null;
      } catch (error) {
        console.warn('Firestore getOrderById failed, falling back to in-memory:', error);
      }
    }

    return this.inMemoryOrders.get(orderId) || null;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const now = Date.now();

    if (isFirebaseConfigured() && db) {
      const docRef = doc(db, 'orders', orderId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        throw new Error(`Pedido con id ${orderId} no encontrado.`);
      }
      await updateDoc(docRef, { status, updatedAt: now });
      return {
        ...(snapshot.data() as Order),
        status,
        updatedAt: now,
      };
    }

    const existing = this.inMemoryOrders.get(orderId);
    if (!existing) {
      throw new Error(`Pedido con id ${orderId} no encontrado.`);
    }
    const updated: Order = {
      ...existing,
      status,
      updatedAt: now,
    };
    this.inMemoryOrders.set(orderId, updated);
    this.persistToLocalStorage();
    return updated;
  }
}

export const orderService = new OrderService();
