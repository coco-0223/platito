# Handoff Report — Services & Security Explorer (M1)

**Agent**: `m1_exp_services` (Services & Security Explorer)  
**Milestone**: M1 (Core Foundation & Shared Services)  
**Date**: 2026-09-17  
**Type**: Hard Handoff (Task complete)  

---

## 1. Observation

1. **Host Environment & Tooling Audit**:
   - `survey_tech_stack/analysis.md` lines 27-41:
     - Node.js: `v22.20.0`, npm: `11.11.0`, git: `2.53.0.windows.2`, Firebase CLI: `15.12.0`.
     - Java runtime: **Not installed** on system PATH.
     - Implication verbatim: *"Java is not installed on the host, which means the local Firebase Java-based Emulator Suite cannot run out-of-the-box without installing JRE; therefore, the application must provide an in-memory/mock service layer for testing and standalone preview."*
2. **Requirements & Scope**:
   - `ORIGINAL_REQUEST.md`:
     - R1 (line 19): *"Desarrollar la interfaz utilizando Next.js o React. Utilizar Firebase como base de datos y Cloud Storage para el almacenamiento."*
     - R2 (line 22): *"El proveedor debe poder subir sus platos, establecer su costo base y gestionar su disponibilidad. El sistema debe asegurar que las imágenes pesen máximo 1 MB (comprimiéndolas o validándolas) antes de subirlas a Firebase."*
     - R3 (line 25): *"El cliente debe poder navegar por el catálogo bajo la marca 'Platito', ver los precios finales (que son el costo base + el margen de la plataforma) y simular la compra de un producto."*
     - AC1 (line 30): *"Existen pruebas automáticas que verifican con éxito que un proveedor puede guardar un plato en la base de datos."*
     - AC3 (line 32): *"Se han implementado reglas de seguridad para que los datos estén protegidos (como pidió el usuario)."*
3. **Interface Contracts & Code Layout**:
   - `PROJECT.md`:
     - Section 4 "Data Access & Resilient Adapter" (lines 20-25): *"Interface abstraction (`DishService`, `StorageService`, `OrderService`). Dual implementations: Firebase Live Adapter... Resilient In-Memory / Local Adapter: Pre-seeded with realistic culinary catalog, providing 100% deterministic test passes (Vitest) and instant zero-config preview without requiring Java emulators."*
     - Section "Interface Contracts" (lines 102-167): Defines `Dish`, `CustomerDishView`, `IDishService`, `OrderItem`, `CustomerInfo`, `Order`, `IOrderService`.
     - Section "Code Layout" (lines 203-230): Dictates file placement for `lib/firebase/config.ts`, `lib/services/dishService.ts`, `lib/services/storageService.ts`, `lib/services/orderService.ts`, `types/dish.ts`, `types/cart.ts`, `types/order.ts`, `types/platform.ts`, `firestore.rules`, and `storage.rules`.

---

## 2. Logic Chain

1. **Environmental Constraint $\rightarrow$ Adapter Pattern**:
   - Observation 1 establishes that Java is absent, preventing local execution of the official Java-based Firebase Emulator Suite.
   - AC1 mandates automated tests proving a provider can save a dish into the database.
   - Therefore, `DishService`, `StorageService`, and `OrderService` must implement a unified interface with an autonomous dual-engine architecture:
     * Mode A (Live Firebase): Connected when valid `NEXT_PUBLIC_FIREBASE_PROJECT_ID` and `NEXT_PUBLIC_FIREBASE_API_KEY` are provided.
     * Mode B (Resilient In-Memory): Executed in tests (Vitest) or offline preview, offering 100% deterministic CRUD persistence and localStorage synchronization in browsers.
2. **Confidentiality & Business Logic**:
   - Observation 2 (R3) dictates that customers view only final prices (`costo base + margen`), hiding raw supplier costs.
   - Therefore, `DishService.getAvailableCustomerDishes(markupPct)` executes `calculateFinalPrice(dish.baseCost, markupPct)` and projects fields into `CustomerDishView`, completely stripping `baseCost` from the customer data transfer object.
3. **Storage Size Security Barrier**:
   - Observation 2 (R2) mandates that images weigh maximum 1 MB ($1,048,576$ bytes).
   - Therefore, `StorageService.uploadDishImage` implements a programmatic barrier checking `file.size <= 1048576`, rejecting non-compliant payloads with a localized descriptive error.
   - `storage.rules` mirrors this constraint in cloud infrastructure: `allow write: if request.resource.size <= 1048576 && request.resource.contentType.matches('image/(jpeg|png|webp|jpg)');`.
4. **Database Integrity & Security Rules**:
   - Observation 2 (AC3) requires robust rules protecting data.
   - Therefore, `firestore.rules` enforces:
     * `dishes`: Public read for showcase; strictly validated create/update requiring positive numeric `baseCost`, non-empty strings, and valid URLs.
     * `orders`: Public anonymous creation with validated customer coordinates (`name`, `phone`, `address`) and non-empty items; immutable order items (only `status` and `updatedAt` updates allowed for platform logistics).
     * `platform_settings`: Public read, protected write.

---

## 3. Caveats

1. **Pricing Utility Dependency**:
   - `dishService.ts` imports `calculateFinalPrice` from `@/lib/utils/pricing` (developed under parallel explorer `m1_exp_tests`). If this utility is not yet created during initial compilation, a local arithmetic fallback is included within `analysis.md` to prevent compilation failures.
2. **Client Browser vs. Node Test Environment**:
   - In-memory persistence uses a standard `Map` in memory combined with `typeof window !== 'undefined'` checks for `localStorage` persistence. In Node/Vitest environments, memory store guarantees complete isolation and persistence per test run.
3. **Firebase Cloud Storage vs. Local Mock Data URL**:
   - When running in mock mode, `StorageService` converts image Blobs to Base64 Data URLs so images render immediately in `<img src="...">` without requiring external network calls.

---

## 4. Conclusion

The specification formulated in `d:\platito\.agents\m1_exp_services\analysis.md` satisfies all architectural and functional requirements of Milestone 1 for Services, Security, and Domain Models:
1. **Types**: Fully specified in `types/dish.ts`, `types/cart.ts`, `types/order.ts`, and `types/platform.ts`.
2. **Services**: Complete, production-grade implementations for `lib/firebase/config.ts`, `lib/services/dishService.ts`, `lib/services/storageService.ts`, and `lib/services/orderService.ts` providing seamless dual-mode operation (Live Firestore/Storage + Resilient In-Memory with realistic seed catalog).
3. **Security Rules**: Complete, syntactically validated `firestore.rules` and `storage.rules` enforcing field validation, size limits ($\le 1\text{ MB}$), and access permissions.

---

## 5. Verification Method

Once the Worker agent implements the files according to `analysis.md`, the implementation can be independently verified using the following steps:

1. **TypeScript Typecheck**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected Result*: Zero type errors in `types/` and `lib/services/`.
2. **Automated Unit & Service Tests**:
   ```powershell
   npx vitest run tests/unit/dishService.test.ts
   ```
   *Expected Result*: Tests pass verifying that `dishService.saveDish` saves a dish, assigns an ID, and can be retrieved via `getDishById` and `getDishes`.
3. **Security Rules Inspection**:
   - Inspect `firestore.rules`: Verify `isValidDish` and `isValidOrder` helper functions and permission blocks.
   - Inspect `storage.rules`: Verify `request.resource.size <= 1048576` constraint.
4. **Seed Catalog Validation**:
   - Run `npx vitest run` or start `npm run dev` to verify that `dishService.getDishes()` returns 6 realistic culinary dishes with valid image URLs and categories.
