# Handoff Report — Survey Spec Miner

**Agent**: `survey_spec_miner`  
**Working Directory**: `d:\platito\.agents\survey_spec_miner`  
**Parent Orchestrator**: `6ec01994-ba78-497c-9438-bc44de7ce98f`  
**Phase**: Survey & Specification Mining (Phase 0)  
**Date**: 2026-09-17

---

## 1. Observation

Direct observations extracted from `d:\platito\ORIGINAL_REQUEST.md`:
- **Line 11**: `"Construir la primera versión funcional (MVP) de Platito, un marketplace gastronómico de marca blanca. El emprendedor carga su catálogo y el cliente compra de forma anónima en una vitrina unificada. El dueño de la plataforma se encarga de la logística y entregas personalmente."`
- **Lines 18-19 (R1)**: `"Desarrollar la interfaz utilizando Next.js o React. Utilizar Firebase como base de datos y Cloud Storage para el almacenamiento."`
- **Lines 21-22 (R2)**: `"El proveedor debe poder subir sus platos, establecer su costo base y gestionar su disponibilidad. El sistema debe asegurar que las imágenes pesen máximo 1 MB (comprimiéndolas o validándolas) antes de subirlas a Firebase."`
- **Lines 24-25 (R3)**: `"El cliente debe poder navegar por el catálogo bajo la marca "Platito", ver los precios finales (que son el costo base + el margen de la plataforma) y simular la compra de un producto."`
- **Lines 29-33 (Acceptance Criteria)**:
  - Line 30: `"- [ ] Existen pruebas automáticas que verifican con éxito que un proveedor puede guardar un plato en la base de datos."`
  - Line 31: `"- [ ] Existen pruebas automáticas que verifican que un cliente ve el precio final correcto y puede agregarlo al carrito."`
  - Line 32: `"- [ ] Se han implementado reglas de seguridad para que los datos estén protegidos (como pidió el usuario)."`
  - Line 33: `"- [ ] Un agente inspector independiente verifica que la página carga correctamente y es visualmente funcional para que luego el usuario la pueda probar manualmente."`
- **Workspace State**: `d:\platito` contains only `ORIGINAL_REQUEST.md` and `.agents/`. No previous application code or configuration exists in the workspace.

---

## 2. Logic Chain

1. **Brand Architecture & Persona Separation**:
   - Observation: Line 11 and Line 24 establish that Platito is a white-label unified marketplace where the consumer browses anonymously under the "Platito" brand, while entrepreneurs load their individual dishes.
   - Deduction: The customer frontend must present a single unified storefront ("Vitrina") with Platito branding. The provider needs a separate management panel (`/provider` or tab) to input culinary items, base costs, and availability. The platform owner needs visibility over orders to coordinate logistics and personal deliveries.

2. **Pricing Engine Mechanics**:
   - Observation: Line 25 explicitly dictates: `"ver los precios finales (que son el costo base + el margen de la plataforma)"`.
   - Deduction: The system must enforce a pricing formula: `finalPrice = baseCost + platformMarkup`. To preserve business confidentiality in a white-label marketplace, the customer must only see `finalPrice`. The provider inputs `baseCost`. The platform markup must be configured either globally or per-item.

3. **Storage & Media Handling Constraint**:
   - Observation: Line 22 specifies: `"El sistema debe asegurar que las imágenes pesen máximo 1 MB (comprimiéndolas o validándolas) antes de subirlas a Firebase."`
   - Deduction: The client-side application must intercept file selection before Firebase Cloud Storage invocation. It should attempt automatic canvas/browser compression to scale images $\le 1\text{ MB}$, and apply a strict validation barrier blocking any file exceeding 1,048,576 bytes. Additionally, Firebase Storage security rules must enforce `request.resource.size <= 1 * 1024 * 1024`.

4. **Cart and Simulated Checkout**:
   - Observation: Line 25 states `"simular la compra de un producto"`, and Line 31 requires automated cart tests.
   - Deduction: The customer must be able to add dishes to a persistent shopping cart, modify quantities, view subtotal/total, and complete an order simulation capturing delivery details (name, phone, address) which records an order into Firebase for the platform owner to fulfill.

5. **Security & Rule Governance**:
   - Observation: Line 32 requires security rules to safeguard data.
   - Deduction: Firestore/RTDB rules must validate required fields, data types, and positive base costs on dish creation, allow public read of dishes, and permit anonymous creation of simulated orders while preventing unauthorized document corruption. Storage rules must restrict file size to $\le 1\text{ MB}$ and allow only image MIME types.

6. **Quality Assurance & Verification**:
   - Observation: Lines 30, 31, and 33 require automated tests for provider dish persistence, automated tests for markup pricing & cart additions, and readiness for independent visual/functional inspection.
   - Deduction: The test suite must include unit and integration tests (e.g. using Vitest/Jest) covering the database save operation, the pricing engine, the cart state, and the image validation logic, while the application must expose error-free visual pages ready for inspector verification.

---

## 3. Caveats

1. **Markup Definition**: The specification does not specify whether `margen de la plataforma` is a fixed dollar amount (e.g. +$500) or a percentage markup (e.g. +20%). The system should support a default percentage (e.g. 20%) with configurable capability, ensuring `precio_final = costo_base + margen`.
2. **Provider Authentication**: In this MVP specification, the focus is on functional dish upload, base cost setting, and availability management. Explicit multi-tenant OAuth/Firebase Auth for providers is not mandated in R2, but provider identification (e.g., providerId or lightweight auth/session) should be supported cleanly.
3. **Simulated Payment**: R3 explicitly states "simular la compra" (simulated checkout). No real payment gateway (Mercado Pago, Stripe) is expected or required.

---

## 4. Conclusion

The specification for Platito MVP is fully analyzed, decomposed, and documented in `d:\platito\.agents\survey_spec_miner\analysis.md`. It identifies:
- 3 distinct user personas (Provider, Anonymous Customer, Platform Owner) plus the Automated Inspector.
- 22 concrete features across 9 functional categories (Provider Panel, Media & Storage, Pricing Engine, Vitrina Showcase, Cart & Checkout, Order Dispatch, Platform Owner Operations, Security Rules, Automated Verification).
- 16 edge cases and boundary conditions with concrete mitigation behaviors.
- Complete domain data schemas (`dishes`, `platform_config`, `orders`, `cart`).
- Dual-barrier image compression and validation design meeting the $\le 1\text{ MB}$ constraint.
- Comprehensive Acceptance Criteria mapping for automated testing and visual inspection.

The specifications are ready for the orchestrator to formulate the master project decomposition (`PROJECT.md`) and milestone roadmap.

---

## 5. Verification Method

To independently verify this specification analysis:
1. **Source Parity Check**: Compare `ORIGINAL_REQUEST.md` against Section 3 ("Features Discovered") and Section 9 ("Acceptance Criteria") in `d:\platito\.agents\survey_spec_miner\analysis.md`.
2. **File Completeness**: Inspect `d:\platito\.agents\survey_spec_miner\analysis.md` to confirm presence of:
   - "## Features Discovered" table with all 8 required columns (`#`, `Category`, `Feature`, `Description`, `Inputs`, `Outputs`, `Error Behavior`, `Discovered Via`).
   - "## Edge Cases" table (`#`, `Feature`, `Input`, `Observed Behavior`).
   - Image 1 MB constraint handling (Section 6).
   - Security Rules definitions (Section 7).
   - Domain schemas (Section 4).
3. **Command Verification**:
   ```powershell
   Get-Content d:\platito\.agents\survey_spec_miner\analysis.md | Select-String -Pattern "Features Discovered", "Edge Cases", "Acceptance Criteria"
   ```
