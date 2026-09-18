export const DEFAULT_MARKUP_PERCENTAGE = 20;

export function roundPrice(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateFinalPrice(
  baseCost: number,
  markupPercentage: number = DEFAULT_MARKUP_PERCENTAGE
): number {
  if (!Number.isFinite(baseCost)) {
    throw new TypeError('El costo base debe ser un número finito válido.');
  }
  if (baseCost < 0) {
    throw new Error('El costo base no puede ser negativo.');
  }
  if (!Number.isFinite(markupPercentage)) {
    throw new TypeError('El porcentaje de margen debe ser un número finito válido.');
  }
  if (markupPercentage < 0) {
    throw new Error('El porcentaje de margen no puede ser negativo.');
  }

  const multiplier = 1 + markupPercentage / 100;
  return roundPrice(baseCost * multiplier);
}

export interface CartItemPriceInput {
  dishId: string;
  name?: string;
  finalPrice?: number;
  baseCost?: number;
  quantity: number;
}

export interface CartTotalsResult {
  subtotal: number;
  total: number;
  itemCount: number;
}

export function calculateCartTotals(
  items: CartItemPriceInput[],
  markupPercentage: number = DEFAULT_MARKUP_PERCENTAGE
): CartTotalsResult {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { subtotal: 0, total: 0, itemCount: 0 };
  }

  let subtotal = 0;
  let itemCount = 0;

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('La cantidad de cada producto debe ser un entero positivo.');
    }

    let unitPrice: number;
    if (typeof item.finalPrice === 'number') {
      if (item.finalPrice < 0) {
        throw new Error('El precio del producto no puede ser negativo.');
      }
      unitPrice = item.finalPrice;
    } else if (typeof item.baseCost === 'number') {
      unitPrice = calculateFinalPrice(item.baseCost, markupPercentage);
    } else {
      throw new Error('Cada ítem del carrito debe especificar finalPrice o baseCost.');
    }

    const itemLineTotal = roundPrice(unitPrice * item.quantity);
    subtotal = roundPrice(subtotal + itemLineTotal);
    itemCount += item.quantity;
  }

  return {
    subtotal,
    total: subtotal,
    itemCount,
  };
}

export function formatCurrency(
  amount: number,
  locale: string = 'es-AR',
  currency: string = 'ARS'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
