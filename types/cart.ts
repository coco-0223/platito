export interface CartItem {
  dishId: string;
  providerId: string;
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
    dish: { id: string; providerId: string; name: string; description?: string; imageUrl?: string; finalPrice: number },
    quantity?: number
  ) => void;
  removeItem: (dishId: string) => void;
  updateQuantity: (dishId: string, quantity: number) => void;
  clearCart: () => void;
}
