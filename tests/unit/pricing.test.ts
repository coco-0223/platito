import { describe, it, expect } from 'vitest';
import {
  calculateFinalPrice,
  calculateCartTotals,
  DEFAULT_MARKUP_PERCENTAGE,
} from '@/lib/utils/pricing';

describe('Pricing Engine: calculateFinalPrice', () => {
  it('applies default 20% platform markup when markup is omitted', () => {
    expect(DEFAULT_MARKUP_PERCENTAGE).toBe(20);
    expect(calculateFinalPrice(1000)).toBe(1200);
    expect(calculateFinalPrice(2000)).toBe(2400);
    expect(calculateFinalPrice(3500)).toBe(4200);
    expect(calculateFinalPrice(5000)).toBe(6000);
  });

  it('applies custom platform markup percentage correctly', () => {
    expect(calculateFinalPrice(1000, 10)).toBe(1100);
    expect(calculateFinalPrice(1000, 15)).toBe(1150);
    expect(calculateFinalPrice(1000, 25)).toBe(1250);
    expect(calculateFinalPrice(1000, 50)).toBe(1500);
    expect(calculateFinalPrice(1000, 100)).toBe(2000);
  });

  it('returns exact base cost when markup percentage is 0%', () => {
    expect(calculateFinalPrice(1500, 0)).toBe(1500);
    expect(calculateFinalPrice(4200.5, 0)).toBe(4200.5);
  });

  it('handles zero base cost gracefully returning 0', () => {
    expect(calculateFinalPrice(0, 20)).toBe(0);
    expect(calculateFinalPrice(0, 0)).toBe(0);
  });

  it('correctly rounds fractional and floating point calculations to 2 decimal places', () => {
    // 10.55 * 1.20 = 12.660000000000002 -> 12.66
    expect(calculateFinalPrice(10.55, 20)).toBe(12.66);
    // 333.33 * 1.15 = 383.3295 -> 383.33
    expect(calculateFinalPrice(333.33, 15)).toBe(383.33);
    // 19.99 * 1.21 = 24.1879 -> 24.19
    expect(calculateFinalPrice(19.99, 21)).toBe(24.19);
  });

  it('throws a descriptive error when base cost is negative', () => {
    expect(() => calculateFinalPrice(-1, 20)).toThrow('El costo base no puede ser negativo.');
    expect(() => calculateFinalPrice(-500)).toThrow('El costo base no puede ser negativo.');
  });

  it('throws a descriptive error when markup percentage is negative', () => {
    expect(() => calculateFinalPrice(1000, -5)).toThrow(
      'El porcentaje de margen no puede ser negativo.'
    );
  });

  it('throws a TypeError when baseCost or markupPercentage is NaN or infinite', () => {
    expect(() => calculateFinalPrice(NaN, 20)).toThrow(TypeError);
    expect(() => calculateFinalPrice(Infinity, 20)).toThrow(TypeError);
    expect(() => calculateFinalPrice(1000, NaN)).toThrow(TypeError);
    expect(() => calculateFinalPrice(1000, Infinity)).toThrow(TypeError);
  });
});

describe('Pricing Engine: calculateCartTotals', () => {
  it('returns zero totals when cart is empty', () => {
    const result = calculateCartTotals([]);
    expect(result).toEqual({ subtotal: 0, total: 0, itemCount: 0 });
  });

  it('calculates totals with pre-computed finalPrice items', () => {
    const items = [
      { dishId: 'dish-1', name: 'Milanesa', finalPrice: 2400, quantity: 2 },
      { dishId: 'dish-2', name: 'Empanadas', finalPrice: 600, quantity: 4 },
    ];
    const result = calculateCartTotals(items);
    // 2400*2 = 4800; 600*4 = 2400; subtotal = 7200
    expect(result.subtotal).toBe(7200);
    expect(result.total).toBe(7200);
    expect(result.itemCount).toBe(6);
  });

  it('calculates totals dynamically from baseCost and markupPercentage when finalPrice is absent', () => {
    const items = [
      { dishId: 'dish-1', name: 'Pizza', baseCost: 2000, quantity: 2 }, // 2000 + 20% = 2400 * 2 = 4800
    ];
    const result = calculateCartTotals(items, 20);
    expect(result.subtotal).toBe(4800);
    expect(result.total).toBe(4800);
    expect(result.itemCount).toBe(2);
  });

  it('handles floating point item quantities and sums without precision drift', () => {
    const items = [
      { dishId: 'd1', finalPrice: 12.66, quantity: 3 }, // 37.98
      { dishId: 'd2', finalPrice: 5.33, quantity: 2 },  // 10.66
    ];
    const result = calculateCartTotals(items);
    expect(result.subtotal).toBe(48.64);
    expect(result.total).toBe(48.64);
    expect(result.itemCount).toBe(5);
  });

  it('throws error when item quantity is 0 or negative', () => {
    const items = [{ dishId: 'd1', finalPrice: 1000, quantity: 0 }];
    expect(() => calculateCartTotals(items)).toThrow(
      'La cantidad de cada producto debe ser un entero positivo.'
    );
  });

  it('throws error when neither finalPrice nor baseCost is provided', () => {
    const items = [{ dishId: 'd1', quantity: 1 } as any];
    expect(() => calculateCartTotals(items)).toThrow(
      'Cada ítem del carrito debe especificar finalPrice o baseCost.'
    );
  });
});
