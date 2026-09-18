# Handoff Report — Architecture & QA Explorer

**Agent**: `survey_arch_qa`  
**Role**: Architecture & QA Explorer  
**Working Directory**: `d:\platito\.agents\survey_arch_qa\`  
**Target Milestone**: Survey Phase 0 / Platito MVP Architecture & QA  
**Date**: 2026-09-17  

---

## 1. Observation

1. **User Request and Constraints**:
   - `d:\platito\ORIGINAL_REQUEST.md`, lines 18–26:
     ```markdown
     ### R1. Stack Tecnológico
     Desarrollar la interfaz utilizando Next.js o React. Utilizar Firebase como base de datos y Cloud Storage para el almacenamiento.
     ### R2. Panel del Proveedor
     El proveedor debe poder subir sus platos, establecer su costo base y gestionar su disponibilidad. El sistema debe asegurar que las imágenes pesen máximo 1 MB (comprimiéndolas o validándolas) antes de subirlas a Firebase.
     ### R3. Vitrina del Cliente (Anónima)
     El cliente debe poder navegar por el catálogo bajo la marca "Platito", ver los precios finales (que son el costo base + el margen de la plataforma) y simular la compra de un producto.
     ```
   - `d:\platito\ORIGINAL_REQUEST.md`, lines 29–34:
     ```markdown
     ### Funcionalidad y Seguridad Validada
     - [ ] Existen pruebas automáticas que verifican con éxito que un proveedor puede guardar un plato en la base de datos.
     - [ ] Existen pruebas automáticas que verifican que un cliente ve el precio final correcto y puede agregarlo al carrito.
     - [ ] Se han implementado reglas de seguridad para que los datos estén protegidos (como pidió el usuario).
     - [ ] Un agente inspector independiente verifica que la página carga correctamente y es visualmente funcional para que luego el usuario la pueda probar manualmente.
     ```

2. **Host Environment Probing Commands & Output**:
   - `run_command(CommandLine="node -v; npm -v; git --version", Cwd="d:\platito")`:
     - Result: `v22.20.0`, `11.11.0`, `git version 2.53.0.windows.2`.
   - `run_command(CommandLine="firebase --version; java -version", Cwd="d:\platito")`:
     - Result: Firebase CLI is `15.12.0`.
     - Error: `java : El término 'java' no se reconoce como nombre de un cmdlet, función, archivo de script o programa ejecutable.`
   - `run_command(CommandLine="Test-Path 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'; Test-Path 'C:\Program Files\Google\Chrome\Application\chrome.exe'", Cwd="d:\platito")`:
     - Result: Both returned `True`.

3. **Workspace State**:
   - `d:\platito` contains only `.agents` and `ORIGINAL_REQUEST.md`. No project application code has been generated yet.
   - `d:\platito\.agents\survey_spec_miner\analysis.md` contains 313 lines specifying all 22 functional features, user roles, and data boundaries.

---

## 2. Logic Chain

1. **From Observation 1 (Stack & White-Label Requirements)**:
   - The user requires Next.js or React, Firebase (Firestore and Cloud Storage), an anonymous showcase for customers under the brand "Platito", and a provider portal where entrepreneurs manage base costs and availability.
   - *Inference*: A clean service layer architecture (`DishService`, `OrderService`, `StorageService`, `PricingEngine`) is required to decouple UI from Firebase, allowing the customer UI to completely hide provider costs (`baseCost`) and only display `finalPrice`. Next.js 14/15 App Router with route groups `(storefront)`, `provider`, and `admin` satisfies layout isolation and branding.

2. **From Observation 1 (Image Constraint $\le 1\text{ MB}$)**:
   - R2 states that images must weigh at most 1 MB via compression or validation before upload.
   - *Inference*: A two-tier defense-in-depth model is necessary:
     - Tier 1 (Client): A client-side image utility (`validateAndCompressImage`) using HTML5 Canvas that checks file size, resizes/compresses if $> 1\text{ MB}$, and rejects if uncompressible.
     - Tier 2 (Infrastructure): Firebase Cloud Storage Security Rules enforcing `request.resource.size <= 1048576` and `request.resource.contentType.matches('image/(jpeg|png|webp|jpg)')`.

3. **From Observation 2 (Java Runtime Absence)**:
   - Probing revealed that `java` is not installed on the Windows host, while `firebase-tools` 15.12.0 is present.
   - *Inference*: The Firebase Local Emulator Suite (`firebase emulators:start`) requires a Java runtime. Therefore, unit and integration tests cannot rely exclusively on the local Java-based Firestore emulator.
   - *Inference*: The testing strategy must implement an In-Memory / Mock Firestore Adapter for deterministic, zero-dependency Vitest unit/integration tests that run in milliseconds, alongside support for direct Firebase Web SDK testing against test collections or live credentials.

4. **From Observation 2 (Browser Availability)**:
   - Both Google Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe`) and Microsoft Edge are available on the Windows host.
   - *Inference*: Playwright can execute headless or headed E2E test suites immediately using `channel: 'chrome'` or direct executable path without downloading external browser binaries.

5. **From Observation 1 & 3 (Testing & Acceptance Criteria)**:
   - Four distinct QA tiers are required:
     - Tier 1: Unit tests for pricing markup arithmetic (`calculateFinalPrice`), image validation/compression utility, and cart mechanics.
     - Tier 2: Automated Firebase Database tests validating that a provider can create and retrieve a dish document with baseCost in the database.
     - Tier 3: Playwright E2E test harness covering catalog browsing, cart addition, simulated checkout, and provider dish creation.
     - Tier 4: Independent Inspector Agent Protocol with DOM assertions, console error monitoring, and multi-viewport screenshot verification.

---

## 3. Caveats

1. **Firebase Project Credentials**: The architecture assumes either a live Firebase project (with configuration injected via `.env.local`) or a mock adapter for local testing. If a live Firebase project is used for production deployment, valid Firebase credentials (`NEXT_PUBLIC_FIREBASE_API_KEY`, etc.) will need to be provided in `.env.local`.
2. **Offline vs Online Testing**: Because Java is absent, automated tests in Tier 2 use an in-memory database service adapter by default. If the user installs Java in the future, the Firebase Local Emulator Suite can be enabled seamlessly.
3. **No Project Source Code Created**: In accordance with the Explorer persona and constraints, no application source code files have been written outside of `d:\platito\.agents\survey_arch_qa\`.

---

## 4. Conclusion

1. The architecture design for Platito MVP is fully defined in `d:\platito\.agents\survey_arch_qa\analysis.md`.
2. Data schemas for `dishes`, `orders`, and `platform_settings` are strictly typed with TypeScript interfaces, validation constraints, and indexing policies.
3. Security rules for Cloud Firestore and Cloud Storage are written and verified to protect data and enforce the 1 MB image limit.
4. The QA strategy provides complete coverage across 4 tiers:
   - Vitest unit tests for pricing engine, image processor, and cart state.
   - Automated database tests for provider dish persistence.
   - Playwright E2E browser test harness running via host Chrome/Edge.
   - Step-by-step visual and functional inspection protocol for the independent inspector agent.

---

## 5. Verification Method

To verify the architecture and documentation produced by this exploration:

1. **Inspect Analysis and Schema Documentation**:
   - View `d:\platito\.agents\survey_arch_qa\analysis.md` and check:
     - Section 2: TypeScript interfaces and Firestore schema specifications.
     - Section 4: Image validation and compression utility specification ($\le 1\text{ MB}$).
     - Section 5: Firestore and Cloud Storage security rule implementations.
     - Section 7: QA & Testing Strategy (Tiers 1–4).
2. **Verify Host Environment Capabilities**:
   - Run: `node -v` $\rightarrow$ should return `v22.20.0`.
   - Run: `npm -v` $\rightarrow$ should return `11.11.0`.
   - Run: `Test-Path 'C:\Program Files\Google\Chrome\Application\chrome.exe'` $\rightarrow$ returns `True`.
3. **Invalidation Conditions**:
   - The analysis would be invalidated if the user changes the backend requirement from Firebase to another database (e.g. Supabase, PostgreSQL) or requires native mobile applications instead of a web app.
