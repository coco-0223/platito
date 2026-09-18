'use client';

import React, { useState } from 'react';
import { CustomerDishView } from '@/types/dish';
import { useCart } from '@/components/cart/CartProvider';
import { ShoppingCart } from 'lucide-react';
import { CartDrawer } from '@/components/cart/CartDrawer';

interface StorefrontViewProps {
  dishes: CustomerDishView[];
}

export function StorefrontView({ dishes }: StorefrontViewProps) {
  const { itemCount } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Categorize dishes
  const categories = Array.from(new Set(dishes.map(d => d.category)));
  const dishesByCategory = categories.map(cat => ({
    name: cat,
    items: dishes.filter(d => d.category === cat)
  }));

  // Discovery Feed: random 3 dishes
  const discoveryFeed = [...dishes].sort(() => 0.5 - Math.random()).slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-orange-600">Platito</h1>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-gray-600 hover:text-orange-600 transition"
          >
            <ShoppingCart size={24} />
            {itemCount > 0 && (
              <span className="absolute top-0 right-0 bg-orange-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-12">
        {/* Discovery Feed */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Descubrimiento ✨</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
            {discoveryFeed.map(dish => (
              <DishCard key={`discovery-${dish.id}`} dish={dish} featured />
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="space-y-8">
          {dishesByCategory.map(category => (
            <div key={category.name}>
              <h2 className="text-xl font-bold text-gray-800 mb-4 capitalize">
                {category.name.replace('_', ' ')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.items.map(dish => (
                  <DishCard key={dish.id} dish={dish} />
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}

function DishCard({ dish, featured = false }: { dish: CustomerDishView; featured?: boolean }) {
  const { addItem, clearCart } = useCart();

  const handleAdd = () => {
    try {
      addItem(dish);
    } catch (err: any) {
      if (err.message === 'SINGLE_PROVIDER_ONLY') {
        const confirmClear = window.confirm(
          'Solo puedes pedir platos de una misma cocina por pedido. ¿Deseas vaciar tu carrito actual y comenzar un pedido nuevo con este plato?'
        );
        if (confirmClear) {
          clearCart();
          setTimeout(() => addItem(dish), 100);
        }
      } else {
        alert('Hubo un error al agregar el plato.');
      }
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex ${featured ? 'flex-col min-w-[280px] snap-center' : 'flex-row'}`}>
      <div className={`${featured ? 'h-48 w-full' : 'w-1/3 h-32'} flex-shrink-0`}>
        <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover" />
      </div>
      <div className={`p-4 flex flex-col justify-between flex-grow ${featured ? '' : ''}`}>
        <div>
          <h3 className="font-semibold text-gray-800 line-clamp-2">{dish.name}</h3>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{dish.description}</p>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-bold text-gray-900">${dish.finalPrice.toLocaleString()}</span>
          <button
            onClick={handleAdd}
            className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium hover:bg-orange-200 transition"
          >
            + Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
