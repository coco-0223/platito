'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import { CartItem, CartContextValue } from '@/types/cart';

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (
    dish: { id: string; name: string; description?: string; imageUrl?: string; finalPrice: number },
    quantity = 1
  ) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.dishId === dish.id);
      if (existing) {
        return prev.map((item) =>
          item.dishId === dish.id
            ? { ...item, quantity: item.quantity + quantity, subtotal: (item.quantity + quantity) * item.finalPrice }
            : item
        );
      }
      return [
        ...prev,
        {
          dishId: dish.id,
          name: dish.name,
          description: dish.description,
          imageUrl: dish.imageUrl,
          finalPrice: dish.finalPrice,
          quantity,
          subtotal: dish.finalPrice * quantity,
        },
      ];
    });
  };

  const removeItem = (dishId: string) => {
    setItems((prev) => prev.filter((item) => item.dishId !== dishId));
  };

  const updateQuantity = (dishId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.dishId === dishId ? { ...item, quantity, subtotal: quantity * item.finalPrice } : item
      )
    );
  };

  const clearCart = () => setItems([]);

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
  const deliveryFee = subtotal > 0 ? 500 : 0; // flat fee for demo
  const total = subtotal + deliveryFee;

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      deliveryFee,
      total,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [items, itemCount, subtotal, deliveryFee, total]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
