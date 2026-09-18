# Handoff Report: Milestone 1 Pricing, Compression & Testing Specifications

**Agent**: `m1_exp_tests` (Pricing, Compression & Testing Explorer)  
**Task**: Milestone 1 (M1: Core Foundation & Shared Services) Specification & Test Suite Design  
**Target Milestone**: M1  
**Working Directory**: `d:\platito\.agents\m1_exp_tests`  
**Handoff Type**: Hard (Task complete)  
**Date**: 2026-09-18  

---

## 1. Observation

Direct observations from source documents and host environment:

1. **User Requirements on Pricing & Vitrina (ORIGINAL_REQUEST.md lines 24-25, 30-31)**:
   - *"R3. Vitrina del Cliente (Anónima): El cliente debe poder navegar por el catálogo bajo la marca 'Platito', ver los precios finales (que son el costo base + el margen de la plataforma) y simular la compra de un producto."*
   - Acceptance Criteria:
     - `[ ] Existen pruebas automáticas que verifican con éxito que un proveedor puede guardar un plato en la base de datos.`
     - `[ ] Existen pruebas automáticas que verifican que un cliente ve el precio final correcto y puede agregarlo al carrito.`
2. **User Requirements on Image Size & Compression (ORIGINAL_REQUEST.md line 22)**:
   - *"R2. Panel del Proveedor: ... El sistema debe asegurar que las imágenes pesen máximo 1 MB (comprimiéndolas o validándolas) antes de subirlas a Firebase."*
3. **Interface Contracts from PROJECT.md (lines 77-100)**:
   - `lib/utils/pricing.ts`:
     ```typescript
     export function calculateFinalPrice(baseCost: number, markupPercentage: number = 20): number;
     export function calculateCartTotals(items: CartItem[], markupPercentage: number = 20): { subtotal: number; total: number };
     ```
   - `lib/utils/imageCompression.ts`:
     ```typescript
     export interface CompressionResult {
       file: File | Blob;
       sizeBytes: number;
       dataUrl: string;
       compressed: boolean;
     }
     export const MAX_IMAGE_SIZE_BYTES = 1048576; // 1 MB
     export async function validateAndCompressImage(file: File, maxSize: number = MAX_IMAGE_SIZE_BYTES): Promise<CompressionResult>;
     ```
4. **Environment Audit (`survey_tech_stack/analysis.md` lines 31-41)**:
   - Node.js `v22.20.0` and npm `11.11.0` are present.
   - Java (JRE/JDK) is NOT installed on the host, preventing the local Firebase Java emulator (`firebase emulators:start`) from running out-of-the-box.
   - Therefore, unit and integration tests must run deterministically via **Vitest** with an in-memory repository adapter.

---

## 2. Logic Chain

1. **Pricing Arithmetic & Confidentiality**:
   - Observation (1) mandates that the customer sees only `finalPrice = baseCost + markup`.
   - Observation (3) defines `calculateFinalPrice(baseCost, markupPercentage = 20)`.
   - In floating-point arithmetic, raw expressions like `10.55 * 1.2` produce `12.660000000000002`.
   - Therefore, `roundPrice(v)` using `Math.round((v + Number.EPSILON) * 100) / 100` must be used to guarantee 2-decimal financial precision.
   - Base cost must be validated: negative numbers throw `Error`, non-finite/NaN throws `TypeError`, zero cost returns `0` (for sample dishes).
   - Cart summation `calculateCartTotals` supports items with either precalculated `finalPrice` or dynamically derived `baseCost`, guaranteeing customer confidentiality.

2. **Image Validation & Compression Pipeline**:
   - Observation (2) mandates that images weigh $\le 1\text{ MB}$ ($1,048,576\text{ bytes}$).
   - Pre-validation immediately rejects non-image MIME types (`image/jpeg`, `image/png`, `image/webp` allowed; `pdf`, `txt` rejected) and zero-byte files.
   - If `file.size <= 1048576`, early-exit passes the file without re-compressing (`compressed: false`).
   - If `file.size > 1048576`, offscreen HTML5 `<canvas>` step-down compression downsizes dimensions (max 1920px) and steps down quality factor `[0.85, 0.70, 0.55, 0.40, 0.25]`.
   - Strict validation gate: If the result remains $> 1,048,576\text{ bytes}$ after all steps, it is explicitly rejected with `Error`.

3. **Acceptance Criterion 1 Automated Database Verification**:
   - Observation (1) requires automated tests verifying a provider can save a dish into the database.
   - Observation (4) shows Java is absent, which would break tests reliant on live Java emulators.
   - Therefore, `dishService.test.ts` exercises `DishService` using the resilient in-memory adapter mode, verifying creation of a dish with `baseCost`, auto-generated IDs, timestamp assignment, retrieval verification by ID and collection query, availability toggling, and input validation.

---

## 3. Caveats

1. **JSDOM Canvas Environment in Node**:
   - Standard Node.js / JSDOM does not provide native 2D canvas rasterization without C++ bindings (`canvas` npm package).
   - `tests/unit/imageCompression.test.ts` uses spies on `document.createElement('canvas')` and `global.Image` to simulate image decoding and canvas blob export.
2. **Currency and Locale Formatting**:
   - Currency display default is Argentine Pesos (ARS / `$`), but calculations operate purely on standard numbers without hardcoded formatting in the mathematical core.
3. **Delivery Fee in MVP**:
   - In Milestone 1, `calculateCartTotals` assumes delivery fee is 0 or handled separately, so `subtotal === total`.

---

## 4. Conclusion

The implementation specifications for Milestone 1 utility engines and Vitest unit test suites are fully defined in `d:\platito\.agents\m1_exp_tests\analysis.md`:
- `lib/utils/pricing.ts` is ready for implementation with pure arithmetic, precision rounding, and full edge-case protection.
- `lib/utils/imageCompression.ts` is ready for implementation with dual-gate $\le 1\text{ MB}$ client-side canvas compressor and strict rejection.
- Vitest unit test suites (`tests/unit/pricing.test.ts`, `tests/unit/imageCompression.test.ts`, `tests/unit/dishService.test.ts`) are completely outlined with exact assertions to satisfy **Acceptance Criterion 1** and **Acceptance Criterion 2**.

---

## 5. Verification Method

To independently verify the test suites once implemented by the Worker:

1. **Run Vitest Unit Tests**:
   ```powershell
   cd d:\platito
   npx vitest run
   ```
2. **Expected Pass Conditions**:
   - `tests/unit/pricing.test.ts`: 100% passing tests for 20% default markup, custom markup, 0% markup, zero cost, floating point rounding, negative cost rejection, cart totals aggregation.
   - `tests/unit/imageCompression.test.ts`: 100% passing tests for $\le 1\text{ MB}$ pass, exact $1,048,576\text{ bytes}$ boundary, $> 1\text{ MB}$ compression pass, $> 1\text{ MB}$ uncompressible rejection, invalid MIME rejection, zero-byte file rejection.
   - `tests/unit/dishService.test.ts`: 100% passing tests for provider dish persistence, base cost integrity, ID generation, database retrieval, and availability toggling.
3. **Invalidation Conditions**:
   - Any test failure in pricing calculations.
   - Any failure where an image $> 1,048,576\text{ bytes}$ is allowed to pass without rejection.
   - Inability to persist and retrieve a provider dish in `dishService.test.ts`.
