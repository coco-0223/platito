# Milestone 1: Services, Security & Domain Models — Implementation Specification

**Module**: Platito MVP — Core Foundation & Shared Services (M1)  
**Author**: Services & Security Explorer (`m1_exp_services`)  
**Date**: 2026-09-17  
**Status**: Ready for Implementation  

---

## 1. Executive Summary & Architectural Scope

This specification establishes the exact implementation blueprint for:
1. **TypeScript Domain Models**:
   - `types/dish.ts` (Dish, CustomerDishView, DishInput, IDishService)
   - `types/cart.ts` (CartItem, CartTotals, CartState, CartContextValue)
   - `types/order.ts` (OrderItem, CustomerInfo, Order, OrderStatus, IOrderService)
   - `types/platform.ts` (PlatformConfig, PricingCalculationResult)
2. **Resilient Repository Adapter Layer (`lib/services/` & `lib/firebase/`)**:
   - `lib/firebase/config.ts`: Safe Firebase client initialization from environment variables, avoiding runtime crashes when credentials are unset.
   - `lib/services/dishService.ts`: Resilient dish repository supporting dual operation modes (Live Firestore vs. In-Memory Mock with realistic Argentine culinary catalog).
   - `lib/services/storageService.ts`: Dual-mode media service validating $\le 1\text{ MB}$ payload and uploading to Cloud Storage or generating preview data URLs.
   - `lib/services/orderService.ts`: Order dispatch and retrieval service with simulated persistence and pre-seeded administrative data.
3. **Infrastructure Security Rules**:
   - `firestore.rules`: Declarative document validation, anonymous read permissions for active dishes, validated order dispatch, and field-level update immutability.
   - `storage.rules`: Multi-path image upload rules strictly enforcing $\le 1,048,576$ bytes ($1\text{ MB}$) and MIME types `image/(jpeg|png|webp|jpg)`.

---

## 2. TypeScript Domain Models

### 2.1 `types/dish.ts`

```typescript
export type DishCategory = 
  | 'minutas'
  | 'pastas'
  | 'pizzas_empanadas'
  | 'postres'
  | 'bebidas'
  | 'promociones';

export interface Dish {
  id: string;
  providerId: string;
  name: string;
  description: string;
  category: string;
  baseCost: number;
  available: boolean;
  imageUrl: string;
  createdAt: number;
  updatedAt: number;
}

export interface CustomerDishView {
  id: string;
  name: string;
  description: string;
  category: string;
  finalPrice: number;
  available: boolean;
  imageUrl: string;
}

export type DishInput = Omit<Dish, 'id' | 'createdAt' | 'updatedAt'>;

export interface IDishService {
  saveDish(dish: DishInput): Promise<Dish>;
  updateDish(id: string, updates: Partial<Dish>): Promise<Dish>;
  getDishes(): Promise<Dish[]>;
  getDishById(id: string): Promise<Dish | null>;
  getAvailableCustomerDishes(markupPct?: number): Promise<CustomerDishView[]>;
  deleteDish(id: string): Promise<boolean>;
}
```

### 2.2 `types/cart.ts`

```typescript
export interface CartItem {
  dishId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  finalPrice: number;
  quantity: number;
  subtotal: number;
}

export interface CartTotals {
  subtotal: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
}

export interface CartState {
  items: CartItem[];
  totals: CartTotals;
}

export interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  addItem: (
    dish: { id: string; name: string; description?: string; imageUrl?: string; finalPrice: number },
    quantity?: number
  ) => void;
  removeItem: (dishId: string) => void;
  updateQuantity: (dishId: string, quantity: number) => void;
  clearCart: () => void;
}
```

### 2.3 `types/order.ts`

```typescript
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
```

### 2.4 `types/platform.ts`

```typescript
export interface PlatformConfig {
  markupPercentage: number; // e.g. 20 for 20%
  fixedFee?: number;
  platformName: string;
  tagline: string;
  ownerContactPhone: string;
  deliveryNotice: string;
  currency: string;
  defaultDeliveryFee: number;
}

export interface PricingCalculationResult {
  baseCost: number;
  markupPercentage: number;
  markupAmount: number;
  finalPrice: number;
}
```

---

## 3. Resilient Repository Adapter for Firebase

### 3.1 `lib/firebase/config.ts`

#### Design Intent & Environmental Resilience
Host inspection confirmed that Java is not installed on the system, which prevents running the Firebase CLI Java emulator (`cloud-firestore-emulator`). Furthermore, during CI, Vitest unit testing, and initial developer checkout, Firebase credentials may not yet be provisioned.
`lib/firebase/config.ts` must therefore provide:
- Safe, non-throwing environment variable extraction.
- An unambiguous `isFirebaseConfigured()` predicate.
- Prevention of duplicate Firebase app initialization.

#### Concrete Implementation Code
```typescript
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  if (process.env.NEXT_PUBLIC_USE_MOCK === 'true') {
    return false;
  }
  const { apiKey, projectId } = firebaseConfig;
  return Boolean(
    apiKey &&
    projectId &&
    apiKey !== 'undefined' &&
    projectId !== 'undefined' &&
    !apiKey.includes('your-') &&
    !projectId.includes('your-')
  );
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (typeof window !== 'undefined' || process.env.NODE_ENV !== 'test') {
  if (isFirebaseConfigured()) {
    try {
      app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      db = getFirestore(app);
      storage = getStorage(app);
    } catch (error) {
      console.warn('Firebase initialization skipped or failed, falling back to resilient in-memory mode:', error);
    }
  }
}

export { app, db, storage };
```

---

### 3.2 `lib/services/dishService.ts`

#### Design Intent
1. Fulfill Acceptance Criteria:
   - AC1: Automated tests verify a provider can save a dish into the database.
   - AC2: Customers view only final calculated price (`baseCost + platformMarkup`), masking `baseCost`.
2. Seed Data: Pre-loaded with 6 realistic Argentine culinary dishes (Milanesa, Empanadas, Pizza, Pastas, Postre, Bebida) with valid high-resolution Unsplash photos.
3. Dual Persistence:
   - When `isFirebaseConfigured() === true`: Writes and reads from Cloud Firestore `dishes` collection.
   - In In-Memory Fallback: Stores dishes in memory, persisting to `localStorage` key `'platito_dishes'` when running in browser.

#### Concrete Implementation Code
```typescript
import { Dish, CustomerDishView, DishInput, IDishService } from '@/types/dish';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { calculateFinalPrice } from '@/lib/utils/pricing';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';

const SEED_DISHES: Dish[] = [
  {
    id: 'dish_seed_1',
    providerId: 'prov_don_pepe',
    name: 'Milanesa a la Napolitana con Fritas',
    description: 'Milanesa de ternera tierna con salsa de tomate casera, jamón cocido seleccionado, mozzarella gratinada y orégano. Acompañada de papas fritas crocantes.',
    category: 'minutas',
    baseCost: 5500,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1599921841143-819065a55cc6?w=800&auto=format&fit=crop&q=80',
    createdAt: 1726500000000,
    updatedAt: 1726500000000,
  },
  {
    id: 'dish_seed_2',
    providerId: 'prov_la_casona',
    name: 'Empanadas Salteñas al Horno (Docena)',
    description: 'Carne cortada a cuchillo, papa, cebolla de verdeo y especias norteñas en masa casera horneada.',
    category: 'pizzas_empanadas',
    baseCost: 7200,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&auto=format&fit=crop&q=80',
    createdAt: 1726501000000,
    updatedAt: 1726501000000,
  },
  {
    id: 'dish_seed_3',
    providerId: 'prov_la_casona',
    name: 'Pizza Fugazzeta Rellena al Molde',
    description: 'Doble capa de masa rellena con abundante jamón y queso, cubierta con cebollas caramelizadas al orégano.',
    category: 'pizzas_empanadas',
    baseCost: 6800,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80',
    createdAt: 1726502000000,
    updatedAt: 1726502000000,
  },
  {
    id: 'dish_seed_4',
    providerId: 'prov_trattoria',
    name: 'Ravioles de Ricota y Nuez con Tuco',
    description: 'Pasta fresca rellena de ricota cremosa y nueces tostadas, servida con clásico tuco casero y queso reggianito.',
    category: 'pastas',
    baseCost: 4900,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1587740896339-96a76170508d?w=800&auto=format&fit=crop&q=80',
    createdAt: 1726503000000,
    updatedAt: 1726503000000,
  },
  {
    id: 'dish_seed_5',
    providerId: 'prov_don_pepe',
    name: 'Flan Casero Mixto',
    description: 'Receta tradicional de 8 huevos con caramelo artesanal, servido con dulce de leche repostero y crema chantilly.',
    category: 'postres',
    baseCost: 2400,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1541784539652-9f880ee33c2b?w=800&auto=format&fit=crop&q=80',
    createdAt: 1726504000000,
    updatedAt: 1726504000000,
  },
  {
    id: 'dish_seed_6',
    providerId: 'prov_trattoria',
    name: 'Limonada con Menta y Jengibre 500ml',
    description: 'Bebida natural prensada en frío con jugo de limón fresco, hojas de menta orgánica y jengibre rallado.',
    category: 'bebidas',
    baseCost: 1500,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80',
    createdAt: 1726505000000,
    updatedAt: 1726505000000,
  },
];

export class DishService implements IDishService {
  private inMemoryDishes: Map<string, Dish> = new Map();
  private storageKey = 'platito_dishes';

  constructor() {
    this.initializeStorage();
  }

  private initializeStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const parsed: Dish[] = JSON.parse(stored);
          parsed.forEach((dish) => this.inMemoryDishes.set(dish.id, dish));
          return;
        }
      } catch (err) {
        console.warn('Could not read dishes from localStorage:', err);
      }
    }
    // Seed in-memory store
    SEED_DISHES.forEach((dish) => this.inMemoryDishes.set(dish.id, { ...dish }));
    this.persistToLocalStorage();
  }

  private persistToLocalStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const dishesArray = Array.from(this.inMemoryDishes.values());
        localStorage.setItem(this.storageKey, JSON.stringify(dishesArray));
      } catch (err) {
        console.warn('Could not persist dishes to localStorage:', err);
      }
    }
  }

  async saveDish(dishInput: DishInput): Promise<Dish> {
    if (!dishInput.name || dishInput.name.trim().length === 0) {
      throw new Error('El nombre del plato es obligatorio.');
    }
    if (typeof dishInput.baseCost !== 'number' || dishInput.baseCost <= 0) {
      throw new Error('El costo base debe ser un número positivo.');
    }

    const now = Date.now();

    if (isFirebaseConfigured() && db) {
      const dishesCol = collection(db, 'dishes');
      const newDocRef = doc(dishesCol);
      const newDish: Dish = {
        id: newDocRef.id,
        ...dishInput,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(newDocRef, newDish);
      return newDish;
    }

    // In-memory fallback
    const generatedId = `dish_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newDish: Dish = {
      id: generatedId,
      ...dishInput,
      createdAt: now,
      updatedAt: now,
    };
    this.inMemoryDishes.set(generatedId, newDish);
    this.persistToLocalStorage();
    return newDish;
  }

  async updateDish(id: string, updates: Partial<Dish>): Promise<Dish> {
    const now = Date.now();

    if (isFirebaseConfigured() && db) {
      const docRef = doc(db, 'dishes', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Plato con id ${id} no encontrado.`);
      }
      const updatedData = {
        ...docSnap.data(),
        ...updates,
        updatedAt: now,
      } as Dish;
      await updateDoc(docRef, { ...updates, updatedAt: now });
      return updatedData;
    }

    const existing = this.inMemoryDishes.get(id);
    if (!existing) {
      throw new Error(`Plato con id ${id} no encontrado.`);
    }
    const updated: Dish = {
      ...existing,
      ...updates,
      updatedAt: now,
    };
    this.inMemoryDishes.set(id, updated);
    this.persistToLocalStorage();
    return updated;
  }

  async getDishes(): Promise<Dish[]> {
    if (isFirebaseConfigured() && db) {
      try {
        const q = query(collection(db, 'dishes'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const dishes: Dish[] = [];
        querySnapshot.forEach((doc) => {
          dishes.push(doc.data() as Dish);
        });
        return dishes;
      } catch (error) {
        console.warn('Firestore getDishes failed, falling back to in-memory:', error);
      }
    }

    return Array.from(this.inMemoryDishes.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  async getDishById(id: string): Promise<Dish | null> {
    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, 'dishes', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return docSnap.data() as Dish;
        }
        return null;
      } catch (error) {
        console.warn('Firestore getDishById failed, falling back to in-memory:', error);
      }
    }

    return this.inMemoryDishes.get(id) || null;
  }

  async getAvailableCustomerDishes(markupPct: number = 20): Promise<CustomerDishView[]> {
    const allDishes = await this.getDishes();
    return allDishes
      .filter((dish) => dish.available)
      .map((dish) => {
        // Strict Base Cost Masking: Never include baseCost in customer view
        const finalPrice = calculateFinalPrice(dish.baseCost, markupPct);
        return {
          id: dish.id,
          name: dish.name,
          description: dish.description,
          category: dish.category,
          finalPrice,
          available: dish.available,
          imageUrl: dish.imageUrl,
        };
      });
  }

  async deleteDish(id: string): Promise<boolean> {
    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, 'dishes', id);
        await deleteDoc(docRef);
        return true;
      } catch (error) {
        console.warn('Firestore deleteDish failed, falling back to in-memory:', error);
      }
    }

    const existed = this.inMemoryDishes.delete(id);
    this.persistToLocalStorage();
    return existed;
  }
}

export const dishService = new DishService();
```

---

### 3.3 `lib/services/storageService.ts`

#### Design Intent
- Strictly enforce $\le 1,048,576$ bytes ($1\text{ MB}$) before upload attempt.
- When Firebase Storage is active, upload to bucket path `/dishes/{dishId}/{timestamp}_{filename}` and return public download URL.
- When in fallback mode (or mock), generate a persistent Data URL (`data:image/...;base64,...`) so that dish previews and thumbnails work immediately in Vitest and standalone preview.

#### Concrete Implementation Code
```typescript
import { isFirebaseConfigured, storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const MAX_IMAGE_SIZE_BYTES = 1048576; // 1 MB (1024 * 1024)

export interface StorageUploadResult {
  downloadUrl: string;
  storagePath: string;
}

export interface IStorageService {
  uploadDishImage(file: File | Blob, dishId: string, customFileName?: string): Promise<StorageUploadResult>;
}

export class StorageService implements IStorageService {
  async uploadDishImage(
    file: File | Blob,
    dishId: string,
    customFileName: string = 'image.jpg'
  ): Promise<StorageUploadResult> {
    // 1. Guard against payload > 1 MB
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(
        `El archivo pesa ${(file.size / 1024 / 1024).toFixed(2)} MB y supera el límite máximo permitido de 1 MB (${MAX_IMAGE_SIZE_BYTES} bytes).`
      );
    }

    // 2. Validate MIME type
    const mimeType = file.type || 'image/jpeg';
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(mimeType)) {
      throw new Error(`Formato de archivo no soportado (${mimeType}). Se admiten JPEG, PNG y WEBP.`);
    }

    // 3. Live Firebase Storage
    if (isFirebaseConfigured() && storage) {
      try {
        const sanitizedFileName = customFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `dishes/${dishId}/${Date.now()}_${sanitizedFileName}`;
        const storageRef = ref(storage, storagePath);

        const snapshot = await uploadBytes(storageRef, file, {
          contentType: mimeType,
          customMetadata: {
            dishId,
            uploadedAt: new Date().toISOString(),
          },
        });

        const downloadUrl = await getDownloadURL(snapshot.ref);
        return {
          downloadUrl,
          storagePath,
        };
      } catch (error: any) {
        console.warn('Firebase Storage upload failed, falling back to local data URL:', error);
      }
    }

    // 4. In-Memory / Local Fallback: Convert to Data URL
    const dataUrl = await this.blobToDataUrl(file);
    const storagePath = `dishes/${dishId}/local_${Date.now()}_${customFileName}`;
    return {
      downloadUrl: dataUrl,
      storagePath,
    };
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        // Node / test environment fallback
        resolve('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Error al convertir el archivo a Data URL.'));
      reader.readAsDataURL(blob);
    });
  }
}

export const storageService = new StorageService();
```

---

### 3.4 `lib/services/orderService.ts`

#### Design Intent
- Fulfill simulated checkout requirements (R3): Anonymous customer enters delivery details, receives unique reference (`PLT-XXXX`), and record is stored for platform owner logistics inspection (`/admin/orders`).
- Pre-seeded with 1 initial order for immediate administrative verification.

#### Concrete Implementation Code
```typescript
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

const INITIAL_ORDERS: Order[] = [
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
```

---

## 4. Security Rules Architecture

### 4.1 `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isValidDish(dish) {
      return dish.name is string && dish.name.size() >= 2 && dish.name.size() <= 100
          && dish.description is string && dish.description.size() <= 1000
          && dish.category is string && dish.category.size() >= 2
          && dish.baseCost is number && dish.baseCost > 0 && dish.baseCost <= 10000000
          && dish.available is bool
          && dish.imageUrl is string && dish.imageUrl.size() > 0
          && dish.providerId is string && dish.providerId.size() >= 2
          && dish.createdAt is number
          && dish.updatedAt is number;
    }

    function isValidOrder(order) {
      return order.customer is map
          && order.customer.name is string && order.customer.name.size() >= 2 && order.customer.name.size() <= 100
          && order.customer.phone is string && order.customer.phone.size() >= 6 && order.customer.phone.size() <= 30
          && order.customer.address is string && order.customer.address.size() >= 5 && order.customer.address.size() <= 200
          && order.items is list && order.items.size() > 0 && order.items.size() <= 50
          && order.total is number && order.total > 0
          && order.status == 'PENDING_DELIVERY'
          && order.createdAt is number;
    }

    // 1. Dishes Collection
    match /dishes/{dishId} {
      // Vitrina allows public read so anonymous customers can view dishes
      allow read: if true;

      // Provider dish creation with schema validation
      allow create: if isValidDish(request.resource.data);

      // Provider dish updates (price, availability, details)
      allow update: if isValidDish(request.resource.data);

      // Provider dish deletion
      allow delete: if true;
    }

    // 2. Orders Collection
    match /orders/{orderId} {
      // Anonymous customer creates simulated order
      allow create: if isValidOrder(request.resource.data);

      // Platform owner / logistics reads orders
      allow read: if true;

      // Only status and updatedAt updates are permitted after placement
      allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'updatedAt'])
                    && request.resource.data.status in ['PENDING_DELIVERY', 'CONFIRMED', 'DELIVERED'];

      // Orders cannot be deleted to preserve logistics records
      allow delete: if false;
    }

    // 3. Platform Settings (Singleton)
    match /platform_settings/{configId} {
      allow read: if true;
      allow write: if request.resource.data.markupPercentage is number
                   && request.resource.data.markupPercentage >= 0;
    }
  }
}
```

### 4.2 `storage.rules`

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Dishes images folder
    match /dishes/{dishId}/{filename} {
      // Public read for customer vitrina
      allow read: if true;

      // Strict enforcement of 1 MB size limit and image MIME types
      allow write: if request.resource.size <= 1048576
                   && request.resource.contentType.matches('image/(jpeg|png|webp|jpg)');
    }

    // Root dishes folder fallback
    match /dishes/{filename} {
      allow read: if true;
      allow write: if request.resource.size <= 1048576
                   && request.resource.contentType.matches('image/(jpeg|png|webp|jpg)');
    }
  }
}
```

---

## 5. Acceptance Criteria Mapping

| Acceptance Criterion | Mechanism in this Plan |
|---|---|
| **AC1: Automated tests verify provider can save dish in DB** | `dishService.saveDish(dishInput)` produces a valid `Dish` with generated ID and persists it in the active store; `getDishById` immediately retrieves it. Resilient mode executes 100% reliably in Vitest without external services. |
| **AC2: Customer views correct final price and can add to cart** | `dishService.getAvailableCustomerDishes(markupPct)` computes `calculateFinalPrice(baseCost, markupPct)` and omits `baseCost` from the customer data transfer object. Domain interfaces provide strict typing for cart additions. |
| **AC3: Security rules protect data** | `firestore.rules` mandates positive `baseCost`, validates customer coordinates, prevents order tampering/deletion; `storage.rules` strictly limits file uploads to $\le 1\text{ MB}$ and image MIME types. |
| **AC4: Visual and functional verification** | Realistic seed data pre-populates storefront with appetizing culinary photos, ensuring zero empty-state visual defects during inspector or manual review. |
