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
  orderBy
} from 'firebase/firestore';

export const SEED_DISHES: Dish[] = [
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

  clearAll(): void {
    this.inMemoryDishes.clear();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(this.storageKey);
      } catch (err) {
        console.warn('Could not clear dishes in localStorage:', err);
      }
    }
  }

  async saveDish(dishInput: DishInput): Promise<Dish> {
    if (!dishInput.name || dishInput.name.trim().length === 0) {
      throw new Error('El nombre del plato es obligatorio.');
    }
    if (
      typeof dishInput.baseCost !== 'number' ||
      dishInput.baseCost <= 0 ||
      !Number.isFinite(dishInput.baseCost)
    ) {
      throw new Error('El costo base debe ser un número positivo mayor a cero.');
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
          providerId: dish.providerId,
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
