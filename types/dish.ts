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
  providerId: string;
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
  clearAll?(): void;
}
