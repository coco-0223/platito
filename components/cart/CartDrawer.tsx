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
  const [warningMsg, setWarningMsg] = React.useState<string | null>(null);
  const [isValidating, setIsValidating] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen || items.length === 0) return;

    let mounted = true;
    setIsValidating(true);
    setWarningMsg(null);

    // Fetch fresh prices from backend
    import('@/lib/services/dishService').then(({ dishService }) => {
      dishService.getAvailableCustomerDishes().then((freshDishes) => {
        if (!mounted) return;
        let changed = false;
        let removed = false;

        items.forEach(cartItem => {
          const freshDish = freshDishes.find(d => d.id === cartItem.dishId);
          if (!freshDish) {
            // Dish no longer available or deleted
            removeItem(cartItem.dishId);
            removed = true;
          } else if (freshDish.finalPrice !== cartItem.finalPrice) {
            // Price changed - in a real app we'd need a specific updatePrice method or we update the state directly.
            // For MVP, we will just warn the user. The updateQuantity trick can't change base price easily without modifying CartProvider.
            // So we will just warn them that the total is outdated, or we update the CartProvider.
            changed = true;
          }
        });

        if (removed) {
          setWarningMsg('Algunos platos ya no están disponibles y fueron removidos de tu carrito.');
        } else if (changed) {
          setWarningMsg('⚠️ El negocio ha actualizado los precios de algunos platos de tu pedido. Por favor, refresca la página antes de pagar.');
        }
        
        setIsValidating(false);
      });
    });

    return () => { mounted = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheckout = () => {
    if (warningMsg && warningMsg.includes('precios')) {
      alert('Debes refrescar la página para obtener los nuevos precios antes de pagar.');
      return;
    }
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
              {warningMsg && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-sm text-yellow-800 rounded-r-md">
                  {warningMsg}
                </div>
              )}
              
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
              disabled={isValidating}
              className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-700 transition disabled:opacity-50"
            >
              <CreditCard size={20} />
              {isValidating ? 'Validando...' : 'Confirmar Pago'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
