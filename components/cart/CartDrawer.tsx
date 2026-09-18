'use client';

import React from 'react';
import { useCart } from './CartProvider';
import { X, Trash2, Plus, Minus, CreditCard } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, subtotal, deliveryFee, total, clearCart } = useCart();

  if (!isOpen) return null;

  const handleCheckout = () => {
    alert(`¡Simulación de pago exitosa! Total pagado: $${total.toLocaleString()}`);
    clearCart();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-white shadow-xl z-50 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between bg-white">
          <h2 className="text-lg font-bold text-gray-800">Tu Pedido</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                <Trash2 size={32} className="text-gray-400" />
              </div>
              <p>Tu carrito está vacío</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.dishId} className="bg-white p-3 rounded-lg shadow-sm flex gap-3">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover rounded-md" />
                  )}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-medium text-gray-800 text-sm line-clamp-1">{item.name}</h4>
                      <p className="text-orange-600 font-semibold mt-1">${item.finalPrice.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border rounded-md">
                        <button 
                          onClick={() => item.quantity > 1 ? updateQuantity(item.dishId, item.quantity - 1) : removeItem(item.dishId)}
                          className="px-2 py-1 text-gray-500 hover:bg-gray-50"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="px-2 text-sm font-medium">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.dishId, item.quantity + 1)}
                          className="px-2 py-1 text-gray-500 hover:bg-gray-50"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button 
                        onClick={() => removeItem(item.dishId)}
                        className="text-red-500 text-sm p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="bg-white p-4 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="space-y-2 mb-4 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Costo de envío</span>
                <span>${deliveryFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-lg pt-2 border-t mt-2">
                <span>Total</span>
                <span>${total.toLocaleString()}</span>
              </div>
            </div>
            
            <button
              onClick={handleCheckout}
              className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-700 transition"
            >
              <CreditCard size={20} />
              Confirmar Pago
            </button>
          </div>
        )}
      </div>
    </>
  );
}
