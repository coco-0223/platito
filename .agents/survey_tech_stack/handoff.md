# Handoff Report — Tech Stack & Tooling Explorer

**Agent**: `survey_tech_stack`  
**Role**: Tech Stack Explorer  
**Working Directory**: `d:\platito\.agents\survey_tech_stack`  
**Parent Orchestrator Conversation ID**: `6ec01994-ba78-497c-9438-bc44de7ce98f`  
**Milestone**: Phase 0 — Technical Blueprint & Environment Survey  
**Date**: 2026-09-17  

---

## 1. Observation

Direct observations obtained through command execution and file inspection:

1. **User Request & Requirements** (`d:\platito\ORIGINAL_REQUEST.md`):
   - Line 11: `"Construir la primera versión funcional (MVP) de Platito, un marketplace gastronómico de marca blanca. El emprendedor carga su catálogo y el cliente compra de forma anónima en una vitrina unificada. El dueño de la plataforma se encarga de la logística y entregas personalmente."`
   - Lines 18-19 (R1): `"Desarrollar la interfaz utilizando Next.js o React. Utilizar Firebase como base de datos y Cloud Storage para el almacenamiento."`
   - Lines 21-22 (R2): `"El proveedor debe poder subir sus platos, establecer su costo base y gestionar su disponibilidad. El sistema debe asegurar que las imágenes pesen máximo 1 MB (comprimiéndolas o validándolas) antes de subirlas a Firebase."`
   - Lines 24-25 (R3): `"El cliente debe poder navegar por el catálogo bajo la marca 'Platito', ver los precios finales (que son el costo base + el margen de la plataforma) y simular la compra de un producto."`
   - Lines 29-33 (Acceptance Criteria):
     - Line 30: `"- [ ] Existen pruebas automáticas que verifican con éxito que un proveedor puede guardar un plato en la base de datos."`
     - Line 31: `"- [ ] Existen pruebas automáticas que verifican que un cliente ve el precio final correcto y puede agregarlo al carrito."`
     - Line 32: `"- [ ] Se han implementado reglas de seguridad para que los datos estén protegidos (como pidió el usuario)."`
     - Line 33: `"- [ ] Un agente inspector independiente verifica que la página carga correctamente y es visualmente funcional para que luego el usuario la pueda probar manualmente."`

2. **Host Environment Probing Commands and Results**:
   - `node -v` $\rightarrow$ `v22.20.0`
   - `npm -v` $\rightarrow$ `11.11.0`
   - `npx --version` $\rightarrow$ `11.11.0`
   - `git --version` $\rightarrow$ `git version 2.53.0.windows.2`
   - `firebase --version` $\rightarrow$ `15.12.0`
   - `java -version` $\rightarrow$ Command failed with error:
     ```
     java : El término 'java' no se reconoce como nombre de un cmdlet, función, archivo de script o programa ejecutable.
     ```
   - `Test-Path "C:\Program Files\Google\Chrome\Application\chrome.exe"` $\rightarrow$ `True`
   - `Test-Path "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"` $\rightarrow$ `True`
   - `firebase projects:list` $\rightarrow$ Successfully returned 18 existing Firebase projects for the active user account.
   - `npx create-next-app --version` $\rightarrow$ `16.3.5`

3. **Workspace State**:
   - `d:\platito` contains only `ORIGINAL_REQUEST.md` and `.agents/`. No project code or build files currently exist.
   - Peer explorers `survey_spec_miner` and `survey_arch_qa` have completed their respective analyses (`d:\platito\.agents\survey_spec_miner\analysis.md` and `d:\platito\.agents\survey_arch_qa\analysis.md`).

---

## 2. Logic Chain

1. **Framework Choice (Next.js 14/15 App Router)**:
   - *From Observation 1*: The project requires a white-label culinary marketplace with clear separation between an anonymous customer storefront (`/`) and an entrepreneur management portal (`/provider`).
   - *Deduction*: Next.js App Router route groups `(storefront)` and `provider` provide natural layout, navigation, and state boundary isolation without third-party routing libraries. Next.js Route Handlers (`app/api/`) also satisfy the need for platform-level operations (simulated order processing, global markup settings) without requiring an auxiliary Node/Express backend.
   - *Deduction*: Modern Node `v22.20.0` and npm `11.11.0` (Observation 2) fully support Next.js 14 and 15 without compatibility barriers.

2. **Firebase Integration & Testing Strategy (Java Absence Mitigation)**:
   - *From Observation 2*: While `firebase-tools 15.12.0` is globally present, `java` is absent on the host. The Firebase Local Emulator Suite (`cloud-firestore-emulator.jar`) strictly requires a Java runtime.
   - *Deduction*: Relying exclusively on `firebase emulators:start` for unit or integration testing will fail on this machine.
   - *Deduction*: The architecture must implement a **Resilient Repository Adapter Pattern**:
     - `DishService` and `StorageService` interface abstraction.
     - **Firebase Adapter**: Used when `.env.local` contains Firebase credentials.
     - **In-Memory / Local Mock Adapter**: Used when running automated tests (Vitest) or during initial preview without credentials. Pre-seeded with sample dishes, this guarantees 100% deterministic test passes and immediate runnable out-of-the-box UI.

3. **Strict $\le 1\text{ MB}$ Image Pipeline**:
   - *From Observation 1 (R2)*: System must guarantee images weigh $\le 1\text{ MB}$ by compressing or validating before Firebase upload.
   - *Deduction*: Client-side library `browser-image-compression` (version `2.0.2`, verified on npm) should be utilized alongside an embedded HTML5 Canvas fallback compressor. It executes before network transmission, guaranteeing that any image $> 1\text{ MB}$ is scaled and compressed down below 1,048,576 bytes.
   - *Deduction*: Cloud Storage security rules must provide a second, immutable defense barrier:
     `allow write: if request.resource.size <= 1048576 && request.resource.contentType.matches('image/(jpeg|png|webp|jpg)');`.

4. **Pricing Engine & Acceptance Criteria**:
   - *From Observation 1 (R3 & Acceptance Criterion 2)*: Final price = base cost + platform markup. Customers must only see final prices under the Platito brand.
   - *Deduction*: Pure unit-testable module `lib/utils/pricing.ts` with `calculateFinalPrice(baseCost, markupPercentage)` satisfies Acceptance Criterion 2 when paired with Vitest unit tests and Playwright E2E verification.

5. **E2E & Inspection Harness**:
   - *From Observation 2*: Google Chrome is verified at `C:\Program Files\Google\Chrome\Application\chrome.exe`.
   - *Deduction*: Playwright can immediately execute against the local Next.js dev server using `channel: 'chrome'`, satisfying Acceptance Criterion 4 (independent inspector agent verification) without external browser binary downloads.

---

## 3. Caveats

1. **Host Java Runtime**: If the user or platform team specifically wishes to run the official Firebase Java Emulator Suite locally instead of the in-memory mock adapter, Java must be installed (e.g. via `winget install Microsoft.OpenJDK.17`). However, our recommended architecture does not require Java to pass all automated tests and function completely.
2. **Firebase Cloud Project**: If deploying live to Google Cloud / Firebase, valid project credentials (`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, etc.) will need to be added to `.env.local`. The mock mode serves as a fallback.
3. **No Project Source Code Created**: In strict adherence to the Explorer role, no project files or source code were created in `d:\platito` outside of the agent's working directory `d:\platito\.agents\survey_tech_stack\`.

---

## 4. Conclusion

The technical stack and tooling architecture for the Platito MVP is fully investigated and documented in `d:\platito\.agents\survey_tech_stack\analysis.md`.

### Concrete Technical Recommendations:
1. **Framework**: Next.js 14/15 with App Router, TypeScript, Tailwind CSS, and Lucide React.
2. **Backend**: Firebase JS SDK v11 (Cloud Firestore & Cloud Storage) backed by a Resilient Repository Adapter (Live Firebase + In-Memory Mock fallback).
3. **Image Processing**: Dual-barrier pipeline (`browser-image-compression` + Canvas fallback + Cloud Storage security rule enforcing $\le 1\text{ MB}$).
4. **Pricing**: Isolated `calculateFinalPrice` module enforcing `baseCost + platformMarkup` with customer-facing confidentiality.
5. **Testing Suite**:
   - **Vitest** for unit/integration tests (`pricing.test.ts`, `imageCompression.test.ts`, `cart.test.ts`, `dishService.test.ts`).
   - **Playwright** (using host Google Chrome) for E2E user journeys and independent visual inspection.
6. **Scripts**:
   - `npm run dev` (starts Next.js dev server on port 3000)
   - `npm test` (`vitest run` executes unit/integration tests)
   - `npm run test:e2e` (`playwright test` executes browser tests)
   - `npm run build` (Next.js production build)

---

## 5. Verification Method

To independently verify the technical findings and documentation of this investigation:

1. **Verify Environment Commands**:
   ```powershell
   node -v          # Returns v22.20.0
   npm -v           # Returns 11.11.0
   firebase -V      # Returns 15.12.0
   Test-Path "C:\Program Files\Google\Chrome\Application\chrome.exe" # Returns True
   ```
2. **Inspect Analysis File**:
   - Check `d:\platito\.agents\survey_tech_stack\analysis.md` for complete sections:
     - Section 2: Windows Host Environment & Tooling Audit
     - Section 3: Framework Selection Matrix (Next.js vs Vite)
     - Section 4: Firebase Architecture, Adapter Pattern & Security Rules
     - Section 5: Image Compression & Validation Pipeline ($\le 1\text{ MB}$)
     - Section 6: Pricing Engine & Showcase Specifications
     - Section 7: Complete Recommended Directory Structure
     - Section 8: Package Manifest & Dependencies
     - Section 9: QA & Testing Harness Implementation Plan
3. **Invalidation Conditions**:
   - The analysis would be invalidated if the backend database requirement is modified to a non-Firebase database (e.g. Supabase, PostgreSQL) or if Next.js is prohibited in favor of a desktop-only architecture.
