# Milestone 1: Pricing, Image Compression & Unit Testing Specifications

**Agent**: `m1_exp_tests` (Pricing, Compression & Testing Explorer)  
**Milestone**: M1 — Core Foundation & Shared Services  
**Working Directory**: `d:\platito\.agents\m1_exp_tests`  
**Date**: 2026-09-18  

---

## 1. Executive Summary

This document provides the definitive implementation specifications for Milestone 1 shared utility services and automated unit test suites for **Platito MVP**:
1. **Pricing Engine (`lib/utils/pricing.ts`)**: Pure deterministic financial calculations computing platform retail prices (`baseCost + platformMarkup`) and cart totals, enforcing strict supplier cost confidentiality, zero/negative cost validation, and floating-point precision protection.
2. **Image Validation & Compression Utility (`lib/utils/imageCompression.ts`)**: Multi-barrier image processor enforcing the $\le 1\text{ MB}$ ($1,048,576\text{ bytes}$) constraint via client-side HTML5 Canvas step-down compression, strict MIME validation, zero-byte file rejection, and a mandatory post-compression rejection gate for uncompressible payloads.
3. **Automated Unit & Integration Test Suites (Vitest)**:
   - `tests/unit/pricing.test.ts`: Formula verification, percentage margin calculations, edge cases (zero cost, fractional cents, negative inputs).
   - `tests/unit/imageCompression.test.ts`: Validation of compliant files ($\le 1\text{ MB}$), boundary check ($1,048,576\text{ bytes}$), automatic compression of oversized files, strict rejection of uncompressible files, format guards, and Vitest browser DOM mocking strategy.
   - `tests/unit/dishService.test.ts`: Full automated verification that a gastronomic provider can successfully persist a dish into the database with base cost and retrieve it intact, directly satisfying **Acceptance Criterion 1**.

---

## 2. Specification: Pricing Engine (`lib/utils/pricing.ts`)

### 2.1 Context & Business Rules (R3, AC-2)
- **Core Formula**:
  $$\text{Precio Final} = \text{Costo Base} + \text{Margen de la Plataforma}$$
  $$\text{Precio Final} = \text{Costo Base} \times \left(1 + \frac{\text{markupPercentage}}{100}\right)$$
- **Default Markup**: $20\%$ (`DEFAULT_MARKUP_PERCENTAGE = 20`).
- **Confidentiality Separation**:
  - The customer vitrina and shopping cart MUST display strictly the calculated `finalPrice`.
  - The supplier `baseCost` is strictly internal and never rendered to customer DOM.
- **Precision & Rounding Policy**:
  - Currency calculations must be rounded cleanly to 2 decimal places using epsilon-adjusted rounding:
    $$\text{roundPrice}(v) = \frac{\text{Math.round}((v + \varepsilon) \times 100)}{100}$$
  - Eliminates IEEE-754 precision artifacts (e.g. `10.55 * 1.2 = 12.660000000000002` becomes `12.66`).

### 2.2 TypeScript Type Definitions & Signatures
```typescript
export interface PricingConfig {
  markupPercentage: number; // e.g. 20 for 20%
  fixedFee?: number;
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
```

### 2.3 Exact Function Contracts & Edge Cases

#### 1. `calculateFinalPrice(baseCost: number, markupPercentage?: number): number`
- **Arguments**:
  - `baseCost`: Provider base cost in currency units.
  - `markupPercentage`: Platform markup percentage (optional, defaults to `20`).
- **Validation & Edge Case Handling**:
  - `baseCost < 0`: Throws `Error('El costo base no puede ser negativo.')`.
  - `!Number.isFinite(baseCost)`: Throws `TypeError('El costo base debe ser un número finito válido.')`.
  - `baseCost === 0`: Returns `0` (supports promotional / sample offerings).
  - `markupPercentage < 0`: Throws `Error('El porcentaje de margen no puede ser negativo.')`.
  - `!Number.isFinite(markupPercentage)`: Throws `TypeError('El porcentaje de margen debe ser un número finito válido.')`.
  - `markupPercentage === 0`: Returns `roundPrice(baseCost)`.
- **Return Value**:
  - Returns positive number rounded to 2 decimal places.

#### 2. `calculateCartTotals(items: CartItemPriceInput[], markupPercentage?: number): CartTotalsResult`
- **Arguments**:
  - `items`: Array of cart items with quantity and either `finalPrice` or `baseCost`.
  - `markupPercentage`: Platform markup percentage (optional, defaults to `20`).
- **Validation & Edge Case Handling**:
  - `items` is empty array or undefined: Returns `{ subtotal: 0, total: 0, itemCount: 0 }`.
  - If any item has `quantity <= 0` or non-integer quantity: Throws `Error('La cantidad de cada producto debe ser un entero positivo.')`.
  - For each item, resolve effective unit price:
    - If `typeof item.finalPrice === 'number'`: Uses `item.finalPrice`.
    - Else if `typeof item.baseCost === 'number'`: Calculates `calculateFinalPrice(item.baseCost, markupPercentage)`.
    - Else: Throws `Error('Cada ítem del carrito debe especificar finalPrice o baseCost.')`.
  - Item subtotal = `roundPrice(unitPrice * item.quantity)`.
  - Cart subtotal = sum of all item subtotals.
  - Cart total = subtotal (for MVP, no additional shipping/handling surcharges unless configured).
  - Item count = sum of all `item.quantity`.

#### 3. Auxiliary Utility: `formatCurrency(amount: number, locale?: string, currency?: string): string`
- Formats price for UI presentation:
  `new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)`.

### 2.4 Reference Implementation (`lib/utils/pricing.ts`)
```typescript
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
```

---

## 3. Specification: Image Validation & Compression (`lib/utils/imageCompression.ts`)

### 3.1 Context & Business Rules (R2, AC-3)
- Requirement: *"El sistema debe asegurar que las imágenes pesen máximo 1 MB (comprimiéndolas o validándolas) antes de subirlas a Firebase."*
- **Constant**: `MAX_IMAGE_SIZE_BYTES = 1048576` ($1\text{ MB} = 1024 \times 1024\text{ bytes}$).
- **Permitted MIME Types**: `['image/jpeg', 'image/png', 'image/webp', 'image/jpg']`.
- **Enforcement Pipeline**:
  1. **Pre-Check (Type & Size)**:
     - Rejects non-image types (`application/pdf`, `text/plain`, etc.) immediately.
     - Rejects empty files (`size === 0`).
  2. **Direct Pass**:
     - If `file.size <= MAX_IMAGE_SIZE_BYTES`, no compression is required.
     - Returns `{ file, sizeBytes: file.size, dataUrl, compressed: false }`.
  3. **Canvas Step-Down Compressor**:
     - If `file.size > MAX_IMAGE_SIZE_BYTES`, renders image onto an offscreen HTML5 `<canvas>`.
     - Downscales maximum dimensions if exceeding `1920x1920` (preserving aspect ratio).
     - Iteratively tests JPEG/WebP compression quality factors: `[0.85, 0.70, 0.55, 0.40]`.
     - Downscales canvas dimensions by $20\%$ if size remains $> 1\text{ MB}$.
  4. **Strict Post-Check Gate**:
     - After all compression attempts, asserts `result.size <= MAX_IMAGE_SIZE_BYTES`.
     - If STILL $> 1,048,576\text{ bytes}$, throws:
       `Error('La imagen no pudo comprimirse por debajo del límite de 1 MB. Por favor seleccione una imagen más liviana.')`.
     - If $\le 1\text{ MB}$, returns `{ file: compressedBlob, sizeBytes: compressedBlob.size, dataUrl, compressed: true }`.

### 3.2 TypeScript Interface (`types/compression.ts` / `lib/utils/imageCompression.ts`)
```typescript
export interface CompressionResult {
  file: File | Blob;
  sizeBytes: number;
  dataUrl: string;
  compressed: boolean;
}

export const MAX_IMAGE_SIZE_BYTES = 1048576; // 1,048,576 bytes = 1 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
```

### 3.3 Test Environment Compatibility (Vitest / Node / jsdom)
In Node/jsdom test environments:
- Standard `HTMLCanvasElement.getContext('2d')` returns `null` unless mocked or using native C++ node-canvas.
- `URL.createObjectURL` is undefined in basic Node environments.
- **Architectural Solution**:
  1. The utility accepts an optional options parameter `ImageCompressionOptions` (allowing custom canvas providers or max size overrides).
  2. Provides an exported mock-friendly hook or helper `fileToDataUrl(file: Blob | File): Promise<string>`.
  3. In `tests/unit/imageCompression.test.ts`, install lightweight global mocks for `URL.createObjectURL`, `URL.revokeObjectURL`, `HTMLCanvasElement.prototype.getContext`, `HTMLCanvasElement.prototype.toBlob`, and `Image` to test the entire lifecycle deterministically without external binary dependencies.

### 3.4 Reference Implementation (`lib/utils/imageCompression.ts`)
```typescript
export const MAX_IMAGE_SIZE_BYTES = 1048576; // 1 MB (1024 * 1024)
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export interface CompressionResult {
  file: File | Blob;
  sizeBytes: number;
  dataUrl: string;
  compressed: boolean;
}

export function fileToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Error al leer el archivo como Data URL'));
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo decodificar la imagen seleccionada.'));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Fallo al exportar el canvas a Blob.'));
      },
      type,
      quality
    );
  });
}

export async function validateAndCompressImage(
  file: File,
  maxSize: number = MAX_IMAGE_SIZE_BYTES
): Promise<CompressionResult> {
  // 1. Validate file existence and emptiness
  if (!file) {
    throw new Error('No se ha proporcionado ningún archivo.');
  }
  if (file.size === 0) {
    throw new Error('El archivo seleccionado está vacío (0 bytes).');
  }

  // 2. Validate MIME Type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(
      `Tipo de archivo no permitido (${file.type || 'desconocido'}). Solo se admiten imágenes JPG, PNG o WebP.`
    );
  }

  // 3. Early pass if file is already compliant
  if (file.size <= maxSize) {
    const dataUrl = await fileToDataUrl(file);
    return {
      file,
      sizeBytes: file.size,
      dataUrl,
      compressed: false,
    };
  }

  // 4. Over-sized file: Execute Canvas Compression Pipeline
  const originalDataUrl = await fileToDataUrl(file);
  const img = await loadImage(originalDataUrl);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('El entorno no soporta renderizado 2D en Canvas.');
  }

  // Calculate constrained initial dimensions (max 1920px)
  const MAX_DIM = 1920;
  let width = img.width;
  let height = img.height;

  if (width > MAX_DIM || height > MAX_DIM) {
    if (width > height) {
      height = Math.round((height * MAX_DIM) / width);
      width = MAX_DIM;
    } else {
      width = Math.round((width * MAX_DIM) / height);
      height = MAX_DIM;
    }
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  // Iterative quality step-down
  const qualitySteps = [0.85, 0.70, 0.55, 0.40, 0.25];
  let bestBlob: Blob | null = null;

  for (const quality of qualitySteps) {
    const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    if (blob.size <= maxSize) {
      bestBlob = blob;
      break;
    }
  }

  // Secondary pass: Dimension downscale if still over maxSize
  if (!bestBlob) {
    let scale = 0.75;
    for (let i = 0; i < 2; i++) {
      const scaledCanvas = document.createElement('canvas');
      const sWidth = Math.round(width * scale);
      const sHeight = Math.round(height * scale);
      scaledCanvas.width = sWidth;
      scaledCanvas.height = sHeight;
      const sCtx = scaledCanvas.getContext('2d');
      if (sCtx) {
        sCtx.drawImage(img, 0, 0, sWidth, sHeight);
        const blob = await canvasToBlob(scaledCanvas, 'image/jpeg', 0.5);
        if (blob.size <= maxSize) {
          bestBlob = blob;
          break;
        }
      }
      scale *= 0.75;
    }
  }

  // 5. Strict Rejection Barrier: Must not exceed maxSize
  if (!bestBlob || bestBlob.size > maxSize) {
    throw new Error(
      'La imagen no pudo comprimirse por debajo del límite de 1 MB. Por favor seleccione una imagen más liviana.'
    );
  }

  const compressedDataUrl = await fileToDataUrl(bestBlob);
  return {
    file: bestBlob,
    sizeBytes: bestBlob.size,
    dataUrl: compressedDataUrl,
    compressed: true,
  };
}
```

---

## 4. Specification: Unit Test Suites (Vitest)

### 4.1 Test Suite 1: `tests/unit/pricing.test.ts`
**Objective**: Guarantee 100% mathematical correctness of platform markup arithmetic, rounding, cart aggregations, and edge case safety.

```typescript
import { describe, it, expect } from 'vitest';
import {
  calculateFinalPrice,
  calculateCartTotals,
  roundPrice,
  DEFAULT_MARKUP_PERCENTAGE,
} from '@/lib/utils/pricing';

describe('Pricing Engine: calculateFinalPrice', () => {
  it('applies default 20% platform markup when markup is omitted', () => {
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
```

---

### 4.2 Test Suite 2: `tests/unit/imageCompression.test.ts`
**Objective**: Verify adherence to the strict $\le 1\text{ MB}$ ($1,048,576\text{ bytes}$) constraint, format validation, and compression lifecycle.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateAndCompressImage,
  MAX_IMAGE_SIZE_BYTES,
  ALLOWED_IMAGE_TYPES,
} from '@/lib/utils/imageCompression';

// Helper to construct simulated File/Blob
function createMockFile(name: string, size: number, type: string): File {
  const buffer = new Uint8Array(size);
  return new File([buffer], name, { type });
}

describe('Image Compression & Validation Utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts an image that is already <= 1 MB without compressing it', async () => {
    const smallFileSize = 500 * 1024; // 500 KB
    const file = createMockFile('empanada.jpg', smallFileSize, 'image/jpeg');

    const result = await validateAndCompressImage(file);

    expect(result.compressed).toBe(false);
    expect(result.sizeBytes).toBe(smallFileSize);
    expect(result.sizeBytes).toBeLessThanOrEqual(MAX_IMAGE_SIZE_BYTES);
    expect(result.dataUrl).toContain('data:image/jpeg;base64');
  });

  it('accepts an image at the exact boundary of 1 MB (1,048,576 bytes)', async () => {
    const exact1MB = 1048576;
    const file = createMockFile('pizza.png', exact1MB, 'image/png');

    const result = await validateAndCompressImage(file);

    expect(result.compressed).toBe(false);
    expect(result.sizeBytes).toBe(exact1MB);
    expect(result.sizeBytes).toBeLessThanOrEqual(MAX_IMAGE_SIZE_BYTES);
  });

  it('rejects non-image MIME types immediately', async () => {
    const pdfFile = createMockFile('document.pdf', 200 * 1024, 'application/pdf');
    await expect(validateAndCompressImage(pdfFile)).rejects.toThrow(
      'Tipo de archivo no permitido'
    );

    const txtFile = createMockFile('notes.txt', 10 * 1024, 'text/plain');
    await expect(validateAndCompressImage(txtFile)).rejects.toThrow(
      'Tipo de archivo no permitido'
    );
  });

  it('rejects empty 0-byte image files', async () => {
    const emptyFile = createMockFile('empty.jpg', 0, 'image/jpeg');
    await expect(validateAndCompressImage(emptyFile)).rejects.toThrow(
      'El archivo seleccionado está vacío (0 bytes).'
    );
  });

  it('triggers canvas compression when file size exceeds 1 MB and succeeds', async () => {
    const oversizedSize = 3 * 1024 * 1024; // 3 MB
    const file = createMockFile('milanesa-large.jpg', oversizedSize, 'image/jpeg');

    // Mock Canvas and Image decoding pipeline for Vitest jsdom environment
    const mockCompressedBlob = new Blob([new Uint8Array(800 * 1024)], { type: 'image/jpeg' }); // 800 KB

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        const mockCanvas: any = {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue({
            drawImage: vi.fn(),
          }),
          toBlob: (cb: (b: Blob) => void) => cb(mockCompressedBlob),
        };
        return mockCanvas;
      }
      return document.createElement(tag);
    });

    // Mock global Image
    global.Image = class {
      onload: () => void = () => {};
      width: number = 3000;
      height: number = 2000;
      src: string = '';
      constructor() {
        setTimeout(() => this.onload(), 10);
      }
    } as any;

    const result = await validateAndCompressImage(file);

    expect(result.compressed).toBe(true);
    expect(result.sizeBytes).toBe(mockCompressedBlob.size);
    expect(result.sizeBytes).toBeLessThanOrEqual(MAX_IMAGE_SIZE_BYTES);
    expect(result.dataUrl).toBeTruthy();
  });

  it('strictly rejects the image if compression cannot reduce size <= 1 MB', async () => {
    const oversizedSize = 5 * 1024 * 1024; // 5 MB
    const file = createMockFile('huge-panoramic.jpg', oversizedSize, 'image/jpeg');

    // Mock Canvas returning still-oversized blob (> 1 MB)
    const stillTooLargeBlob = new Blob([new Uint8Array(1.5 * 1024 * 1024)], { type: 'image/jpeg' });

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        const mockCanvas: any = {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue({
            drawImage: vi.fn(),
          }),
          toBlob: (cb: (b: Blob) => void) => cb(stillTooLargeBlob),
        };
        return mockCanvas;
      }
      return document.createElement(tag);
    });

    global.Image = class {
      onload: () => void = () => {};
      width: number = 4000;
      height: number = 3000;
      src: string = '';
      constructor() {
        setTimeout(() => this.onload(), 10);
      }
    } as any;

    await expect(validateAndCompressImage(file)).rejects.toThrow(
      'La imagen no pudo comprimirse por debajo del límite de 1 MB. Por favor seleccione una imagen más liviana.'
    );
  });
});
```

---

### 4.3 Test Suite 3: `tests/unit/dishService.test.ts`
**Objective**: Satisfy **Acceptance Criterion 1**:
> *"Existen pruebas automáticas que verifican con éxito que un proveedor puede guardar un plato en la base de datos."*

This automated test suite verifies:
1. Provider creates and saves a dish into the database with `name`, `description`, `category`, `baseCost`, `imageUrl`, and `available`.
2. Database assigns an auto-generated unique ID and valid timestamps.
3. Database retrieval (`getDishById` and `getDishes`) returns the persisted dish with field integrity.
4. Provider can update dish availability (`available: false`), and updated status is preserved in database.
5. Saving a dish with non-positive or invalid base cost is rejected by service-level validation.

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { DishService } from '@/lib/services/dishService';
import { Dish } from '@/types/dish';

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
```

---

## 5. Test Infrastructure & Configuration Specifications

### 5.1 `vitest.config.ts` Specification
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

### 5.2 `tests/setup.ts` (Global JSDOM Polyfills)
```typescript
// Polyfill for FileReader and URL object URLs in JSDOM if needed
if (typeof window !== 'undefined') {
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = (blob: Blob | MediaSource) => `blob:mock-url-${Math.random()}`;
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = () => {};
  }
}
```

### 5.3 Package Manifest Scripts (`package.json`)
The worker must ensure the following scripts are present in `package.json`:
- `"test"`: `"vitest run"`
- `"test:watch"`: `"vitest"`
- `"test:coverage"`: `"vitest run --coverage"`

---

## 6. Synthesis & Cross-Explorer Alignment

- **Scaffolding Explorer (`m1_exp_scaffold`)**:
  - `vitest`, `jsdom`, `@types/node` must be included in `devDependencies`.
  - Path alias `@/*` must map to `./*` in `tsconfig.json` and `vitest.config.ts`.
- **Services Explorer (`m1_exp_services`)**:
  - `types/dish.ts` and `lib/services/dishService.ts` must expose `saveDish`, `updateDish`, `getDishes`, `getDishById`, and `clearAll` methods conforming to the interfaces exercised in `tests/unit/dishService.test.ts`.
  - In-memory mock adapter ensures zero-dependency execution for `npm test` without requiring Java or Firebase emulator installations.
