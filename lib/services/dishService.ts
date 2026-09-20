import { Dish, CustomerDishView, DishInput, IDishService, Ingredient } from '@/types/dish';
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
    description: 'Milanesa de ternera tierna con salsa de tomate casera...',
    category: 'minutas',
    productionCost: 3000,
    profitMargin: 83.33,
    baseCost: 5500,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1599921841143-819065a55cc6?w=800&auto=format&fit=crop&q=80',
    createdAt: 1726500000000,
    updatedAt: 1726500000000,
  }
];

export class DishService implements IDishService {
  private inMemoryDishes: Map<string, Dish> = new Map();
  private inMemoryIngredients: Map<string, Ingredient> = new Map();
  private storageKey = 'platito_dishes';
  private ingredientsStorageKey = 'platito_ingredients';

  constructor() {
    this.initializeStorage();
  }

  private initializeStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const storedDishes = localStorage.getItem(this.storageKey);
        if (storedDishes) {
          const parsed: Dish[] = JSON.parse(storedDishes);
          parsed.forEach((dish) => this.inMemoryDishes.set(dish.id, dish));
        } else {
          SEED_DISHES.forEach((dish) => this.inMemoryDishes.set(dish.id, { ...dish }));
          this.persistToLocalStorage();
        }

        const storedIngs = localStorage.getItem(this.ingredientsStorageKey);
        if (storedIngs) {
          const parsedIngs: Ingredient[] = JSON.parse(storedIngs);
          parsedIngs.forEach((ing) => this.inMemoryIngredients.set(ing.id, ing));
        }
      } catch (err) {
        console.warn('Could not read from localStorage:', err);
      }
    }
  }

  private persistToLocalStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const dishesArray = Array.from(this.inMemoryDishes.values());
        localStorage.setItem(this.storageKey, JSON.stringify(dishesArray));
        
        const ingsArray = Array.from(this.inMemoryIngredients.values());
        localStorage.setItem(this.ingredientsStorageKey, JSON.stringify(ingsArray));
      } catch (err) {
        console.warn('Could not persist to localStorage:', err);
      }
    }
  }

  // --- INGREDIENTS ---
  async getIngredients(): Promise<Ingredient[]> {
    return Array.from(this.inMemoryIngredients.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async saveIngredient(ing: Omit<Ingredient, 'id'>): Promise<Ingredient> {
    const generatedId = `ing_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newIng: Ingredient = { id: generatedId, ...ing };
    this.inMemoryIngredients.set(generatedId, newIng);
    this.persistToLocalStorage();
    return newIng;
  }

  async updateIngredient(id: string, updates: Partial<Ingredient>, updateDishes: boolean): Promise<Ingredient> {
    const existing = this.inMemoryIngredients.get(id);
    if (!existing) throw new Error(`Ingrediente ${id} no encontrado.`);
    
    const newCost = updates.cost !== undefined ? updates.cost : existing.cost;
    const updated: Ingredient = { ...existing, ...updates };
    this.inMemoryIngredients.set(id, updated);

    if (updateDishes && newCost !== existing.cost) {
      // Update all dishes that use this ingredient
      for (const dish of Array.from(this.inMemoryDishes.values())) {
        if (dish.ingredients?.some(i => i.ingredientId === id)) {
          // Recalculate production cost
          let newProductionCost = 0;
          for (const dishIng of dish.ingredients) {
            const ingCost = dishIng.ingredientId === id ? newCost : (this.inMemoryIngredients.get(dishIng.ingredientId)?.cost || 0);
            newProductionCost += (ingCost * dishIng.quantity);
          }
          // Recalculate selling price (baseCost) based on existing margin
          const newBaseCost = newProductionCost * (1 + dish.profitMargin / 100);
          
          this.inMemoryDishes.set(dish.id, {
            ...dish,
            productionCost: newProductionCost,
            baseCost: newBaseCost,
            updatedAt: Date.now()
          });
        }
      }
    }

    this.persistToLocalStorage();
    return updated;
  }

  async deleteIngredient(id: string): Promise<boolean> {
    const existed = this.inMemoryIngredients.delete(id);
    this.persistToLocalStorage();
    return existed;
  }

  // --- DISHES ---
  async saveDish(dishInput: DishInput): Promise<Dish> {
    const now = Date.now();
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
    const existing = this.inMemoryDishes.get(id);
    if (!existing) throw new Error(`Plato con id ${id} no encontrado.`);
    const updated: Dish = { ...existing, ...updates, updatedAt: Date.now() };
    this.inMemoryDishes.set(id, updated);
    this.persistToLocalStorage();
    return updated;
  }

  async getDishes(): Promise<Dish[]> {
    return Array.from(this.inMemoryDishes.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  async getDishById(id: string): Promise<Dish | null> {
    return this.inMemoryDishes.get(id) || null;
  }

  async getAvailableCustomerDishes(markupPct: number = 20): Promise<CustomerDishView[]> {
    const allDishes = await this.getDishes();
    return allDishes
      .filter((dish) => dish.available)
      .map((dish) => {
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
    const existed = this.inMemoryDishes.delete(id);
    this.persistToLocalStorage();
    return existed;
  }
}

export const dishService = new DishService();
