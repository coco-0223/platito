import { describe, it, expect, beforeEach } from 'vitest';
import { DishService } from '@/lib/services/dishService';

describe('Acceptance Criterion 1: Provider Dish Database Persistence', () => {
  let dishService: DishService;

  beforeEach(() => {
    // DishService defaults to in-memory resilient adapter in test environment
    dishService = new DishService();
    dishService.clearAll(); // Ensure clean slate for each test
  });

  it('successfully creates and saves a provider dish with baseCost into the database', async () => {
    // 1. Arrange: Provider input payload
    const providerInput = {
      providerId: 'prov-casona-01',
      name: 'Sorrentinos Caseros de Jamón y Queso',
      description: 'Pasta rellena artesanal servida con salsa fileto y queso parmesano rallado.',
      category: 'pastas',
      baseCost: 4500,
      available: true,
      imageUrl: 'https://storage.platito.test/dishes/sorrentinos.webp',
    };

    // 2. Act: Provider executes saveDish
    const savedDish = await dishService.saveDish(providerInput);

    // 3. Assert: Verify saved entity properties
    expect(savedDish).toBeDefined();
    expect(savedDish.id).toBeTruthy();
    expect(typeof savedDish.id).toBe('string');
    expect(savedDish.name).toBe('Sorrentinos Caseros de Jamón y Queso');
    expect(savedDish.baseCost).toBe(4500);
    expect(savedDish.available).toBe(true);
    expect(savedDish.providerId).toBe('prov-casona-01');
    expect(savedDish.category).toBe('pastas');
    expect(savedDish.createdAt).toBeGreaterThan(0);
    expect(savedDish.updatedAt).toBeGreaterThan(0);

    // 4. Act: Retrieve the dish from the database by ID
    const retrievedDish = await dishService.getDishById(savedDish.id);

    // 5. Assert: Persistence verification
    expect(retrievedDish).not.toBeNull();
    expect(retrievedDish?.id).toBe(savedDish.id);
    expect(retrievedDish?.name).toBe(providerInput.name);
    expect(retrievedDish?.baseCost).toBe(4500);
    expect(retrievedDish?.available).toBe(true);

    // 6. Act: Query all provider dishes
    const allDishes = await dishService.getDishes();
    expect(allDishes.some((d) => d.id === savedDish.id)).toBe(true);
  });

  it('allows provider to toggle and persist dish availability in the database', async () => {
    // 1. Create available dish
    const dish = await dishService.saveDish({
      providerId: 'prov-casona-01',
      name: 'Flan Casero con Dulce de Leche',
      description: 'Flan tradicional de huevos con caramelo y dulce de leche colonial.',
      category: 'postres',
      baseCost: 1800,
      available: true,
      imageUrl: 'https://storage.platito.test/dishes/flan.webp',
    });

    expect(dish.available).toBe(true);

    // 2. Provider toggles availability to false
    const updated = await dishService.updateDish(dish.id, { available: false });
    expect(updated.available).toBe(false);

    // 3. Confirm database record was updated
    const freshDish = await dishService.getDishById(dish.id);
    expect(freshDish?.available).toBe(false);
  });

  it('rejects saving a dish with zero or negative baseCost', async () => {
    const invalidNegative = {
      providerId: 'prov-01',
      name: 'Invalid Dish',
      description: 'Should fail',
      category: 'minutas',
      baseCost: -500,
      available: true,
      imageUrl: 'https://storage.platito.test/dishes/test.webp',
    };

    await expect(dishService.saveDish(invalidNegative)).rejects.toThrow(
      'El costo base debe ser un número positivo mayor a cero.'
    );

    const invalidZero = {
      ...invalidNegative,
      baseCost: 0,
    };

    await expect(dishService.saveDish(invalidZero)).rejects.toThrow(
      'El costo base debe ser un número positivo mayor a cero.'
    );
  });

  it('rejects saving a dish with missing required name', async () => {
    const missingName = {
      providerId: 'prov-01',
      name: '   ',
      description: 'Missing name',
      category: 'minutas',
      baseCost: 3000,
      available: true,
      imageUrl: 'https://storage.platito.test/dishes/test.webp',
    };

    await expect(dishService.saveDish(missingName)).rejects.toThrow(
      'El nombre del plato es obligatorio.'
    );
  });
});
