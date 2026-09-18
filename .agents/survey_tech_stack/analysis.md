# Platito MVP — Technical Stack & Tooling Investigation Analysis

**Agent**: `survey_tech_stack`  
**Role**: Tech Stack Explorer  
**Working Directory**: `d:\platito\.agents\survey_tech_stack`  
**Target Milestone**: Phase 0 — Survey & Technical Blueprint  
**Timestamp**: 2026-09-17T23:58:00Z  

---

## 1. Executive Summary

This document establishes the comprehensive technical architecture, tooling audit, framework selection, Firebase integration model, client-side media processing pipeline, directory layout, and testing harness for the **Platito MVP** project.

### Core Recommendations at a Glance:
1. **Framework**: **Next.js 14/15 with App Router**, TypeScript, and Tailwind CSS.
2. **Backend / Cloud Services**: **Firebase Web SDK v11/v10** (Cloud Firestore + Cloud Storage) with a **Resilient Repository Adapter** supporting both live Firebase and an in-memory/localStorage mock mode for zero-dependency local testing.
3. **Host Environment Finding**: Node.js `v22.20.0`, npm `11.11.0`, git `2.53.0`, `firebase-tools 15.12.0` are installed. **Java is NOT installed on the host**, which means the local Firebase Java-based Emulator Suite cannot run out-of-the-box without installing JRE; therefore, the application must provide an in-memory/mock service layer for testing and standalone preview.
4. **Media Processing Pipeline**: Client-side image validation and auto-compression targeting strictly $\le 1\text{ MB}$ using `browser-image-compression` backed by an embedded HTML5 Canvas compression utility, paired with Firebase Storage Security Rules enforcing `request.resource.size <= 1048576`.
5. **Pricing Engine**: Pure calculation module (`calculateFinalPrice`) computing `baseCost + platformMarkup` with configurable margin, ensuring the anonymous customer storefront displays only the unified final price.
6. **Testing & QA**: **Vitest** for fast unit/integration testing (pricing arithmetic, image validation, cart store, database persistence) and **Playwright** utilizing host-installed Google Chrome for end-to-end user journeys and visual inspection.

---

## 2. Windows Host Environment & Tooling Audit

A comprehensive probe of the Windows host environment in `d:\platito` was conducted using system terminal commands:

| Tool / Component | Version / Path | Status | Impact on Architecture |
|---|---|---|---|
| **Node.js** | `v22.20.0` (64-bit) | ✅ Installed | Modern LTS runtime supporting native fetch, ES modules, and Next.js 14/15. |
| **npm** | `11.11.0` | ✅ Installed | High-performance modern package manager supporting package overrides and workspaces. |
| **npx** | `11.11.0` | ✅ Installed | Available for executing scaffolding tools (`create-next-app@16.3.5`, `vitest`, `playwright`). |
| **Python** | `3.14.0` | ✅ Installed | Available for helper scripts or mock servers if ever needed. |
| **Git** | `2.53.0.windows.2` | ✅ Installed | Available for version control; workspace is currently uninitialized git repo. |
| **Firebase CLI** | `firebase-tools 15.12.0` | ✅ Installed & Authenticated | Globally accessible CLI. Host already holds authenticated credentials (`firebase projects:list` succeeded with 18 existing projects). |
| **Java (JRE/JDK)** | *None found on PATH* | ⚠️ **Not Installed** | **Critical constraint**: `firebase emulators:start` requires Java 11+ to run `cloud-firestore-emulator-v1.20.4.jar`. Without Java, the local emulator suite cannot run directly. **Resolution**: Implement an in-memory mock repository adapter for fast test execution and offline preview. Optional: `winget install Microsoft.OpenJDK.17` if user desires the cloud emulator locally. |
| **Google Chrome** | `C:\Program Files\Google\Chrome\Application\chrome.exe` | ✅ Present | Verified with `Test-Path`. Playwright can use this system binary via `channel: 'chrome'` without downloading headless binaries. |
| **Microsoft Edge** | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` | ✅ Present | Verified with `Test-Path`. Available as alternative browser engine for cross-browser testing. |
| **Package Installer** | `winget v1.29.290` | ✅ Available | Can install system-level packages (such as OpenJDK) if required. |

---

## 3. Framework Selection: Next.js (App Router) vs. React + Vite

Requirement **R1** states:
> *"Desarrollar la interfaz utilizando Next.js o React. Utilizar Firebase como base de datos y Cloud Storage para el almacenamiento."*

### Comparative Evaluation

| Evaluation Criteria | Next.js 14/15 (App Router) | React + Vite (SPA) | Winner / Analysis |
|---|---|---|---|
| **User Request Alignment** | Explicitly listed as first preference ("Next.js o React") and indicated in orchestrator guidelines. | Listed as secondary option. | **Next.js** |
| **Route Architecture** | Built-in App Router with nested layouts (`(storefront)/layout.tsx` vs `provider/layout.tsx`). | Requires `react-router-dom` manual setup and manual layout nesting. | **Next.js** |
| **Brand Isolation & Layouts** | Natural separation: Platito customer storefront (`/`) vs Provider portal (`/provider`) with independent navigation headers. | Requires manual route guarding and component wrapping. | **Next.js** |
| **Server-Side API Capability** | Built-in Next.js Route Handlers (`app/api/dishes`, `app/api/orders`, `app/api/settings`) allowing secure platform logic and simulated webhooks. | Requires separate Express/Fastify server or Firebase Cloud Functions for server logic. | **Next.js** |
| **SEO & Sharing** | Server-rendered metadata for dishes when shared on WhatsApp or social networks. | Pure SPA requires prerendering services or has blank initial HTML. | **Next.js** |
| **Image Optimization** | `next/image` with automatic WebP conversion, lazy loading, and layout shifts prevention. | Manual `<img>` or custom image loaders. | **Next.js** |
| **Styling & Icons** | Zero-config Tailwind CSS + Lucide React icons. | Zero-config Tailwind CSS + Lucide React icons. | **Tie** |
| **Testability** | Fully testable with Vitest (React Testing Library) and Playwright. | Fully testable with Vitest and Playwright. | **Tie** |

### Decision: Next.js 14/15 with App Router
**Rationale**:
- Next.js App Router cleanly separates the **Customer Vitrina** (`/`, `/cart`) from the **Provider Panel** (`/provider`), each with its own layout, header, and UX behavior.
- Route Handlers allow simulating checkout processing, logging orders, and serving dynamic platform configuration without spinning up an auxiliary backend server.
- Interactive components use `"use client"` directives seamlessly with Firebase Web SDK hooks and local state.

---

## 4. Firebase Architecture & Resilient Adapter Pattern

### 4.1. Firebase SDK Version
- **Recommended Version**: `firebase@^11.0.0` (or `firebase@^10.14.0`).
- The modern modular SDK enables tree-shaking, keeping the client bundle lightweight:
  ```typescript
  import { initializeApp, getApps, getApp } from "firebase/app";
  import { getFirestore, collection, doc, setDoc, getDocs, onSnapshot, query, where, orderBy } from "firebase/firestore";
  import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
  ```

### 4.2. Host Environment Finding: Java & Emulator Mitigation
Because `java` is absent on the host, running the official Firebase Java-based Emulator Suite (`cloud-firestore-emulator-v1.20.4.jar`) fails.

To ensure **100% test reliability**, **instant developer startup**, and **zero-friction manual preview**, Platito will implement the **Repository Adapter Pattern**:

```
                  ┌─────────────────────────────────┐
                  │          UI Components          │
                  │   (CatalogGrid, DishFormModal)  │
                  └────────────────┬────────────────┘
                                   │
                                   ▼
                  ┌─────────────────────────────────┐
                  │      DishService Interface      │
                  │ (getDishes, createDish, update) │
                  └────────────────┬────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   ┌──────────────────────┐                  ┌──────────────────────┐
   │ FirebaseFirestore    │                  │ InMemoryMock         │
   │ Adapter              │                  │ Adapter              │
   │ (Used when           │                  │ (Used in tests, CI,  │
   │ NEXT_PUBLIC_FIREBASE │                  │ or when .env.local   │
   │ credentials set)     │                  │ is unconfigured)     │
   └──────────────────────┘                  └──────────────────────┘
```

#### Dual Operational Modes:
1. **Live Firebase Mode**:
   - Triggered when `NEXT_PUBLIC_FIREBASE_PROJECT_ID` and `NEXT_PUBLIC_FIREBASE_API_KEY` are provided in `.env.local`.
   - Connects directly to Cloud Firestore and Cloud Storage.
2. **Local Mock / Standalone Mode**:
   - Active when environment variables are missing OR when `NEXT_PUBLIC_USE_MOCK=true`.
   - Stores dishes and simulated orders in an in-memory store with `localStorage` persistence.
   - Pre-seeded with realistic culinary catalog items (Entradas, Principales, Postres) so the app is instantly rich and functional upon `npm run dev`.
   - Handles simulated image upload by generating an Object URL or data URI while enforcing the exact same validation and $\le 1\text{ MB}$ compression rules.

### 4.3. Firestore Collections Schema

1. **`dishes` Collection**:
   - `id`: string (UUID or Firestore auto-generated)
   - `providerId`: string (identifier for the entrepreneur, e.g. `"provider_default"`)
   - `name`: string (e.g. `"Empanadas Salteñas al Horno"`)
   - `description`: string
   - `category`: string (`"Entradas"` | `"Platos Principales"` | `"Postres"` | `"Bebidas"`)
   - `baseCost`: number (provider's base cost, e.g. `2500`)
   - `available`: boolean (availability toggle)
   - `imageUrl`: string (Cloud Storage download URL or data URI)
   - `imageSize`: number (size in bytes, strictly $\le 1048576$)
   - `createdAt`: ISO string or Firestore Timestamp
   - `updatedAt`: ISO string or Firestore Timestamp

2. **`orders` Collection** (Simulated Purchases):
   - `id`: string
   - `customer`: object `{ name: string, phone: string, address: string, notes?: string }`
   - `items`: array of `{ dishId: string, name: string, quantity: number, unitPrice: number, subtotal: number }`
   - `totalAmount`: number
   - `status`: `"simulated_pending"` | `"confirmed"` | `"delivered"`
   - `createdAt`: ISO string or Firestore Timestamp

3. **`platform_settings` Collection / Singleton**:
   - `id`: `"global"`
   - `markupPercentage`: number (default: `20` for 20% margin)
   - `platformName`: string (`"Platito"`)
   - `contactPhone`: string (Logistics owner contact)

### 4.4. Security Rules Specification

#### Cloud Firestore Security Rules (`firestore.rules`):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Dishes collection
    match /dishes/{dishId} {
      // Anyone can read available dishes in the vitrina
      allow read: if true;
      
      // Provider creates or modifies dish with valid data
      allow create, update: if request.resource.data.name is string
                            && request.resource.data.name.size() > 0
                            && request.resource.data.baseCost is number
                            && request.resource.data.baseCost >= 0
                            && request.resource.data.available is bool
                            && request.resource.data.imageSize <= 1048576;
                            
      allow delete: if true; // Provider management
    }
    
    // Orders collection (Customer purchase simulation)
    match /orders/{orderId} {
      // Customer can create simulated order anonymously
      allow create: if request.resource.data.items is list
                    && request.resource.data.items.size() > 0
                    && request.resource.data.totalAmount is number
                    && request.resource.data.totalAmount > 0
                    && request.resource.data.customer.name is string
                    && request.resource.data.customer.address is string;
                    
      // Platform owner can read and update orders
      allow read, update: if true;
    }
    
    // Platform Settings
    match /platform_settings/{settingId} {
      allow read: if true;
      allow write: if false; // Platform owner configuration
    }
  }
}
```

#### Cloud Storage Security Rules (`storage.rules`):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /dishes/{dishId}/{filename} {
      // Public read for customer showcase
      allow read: if true;
      
      // Strict <= 1 MB upload constraint and valid image MIME types
      allow write: if request.resource.size <= 1048576
                   && request.resource.contentType.matches('image/(jpeg|png|webp|jpg)');
    }
  }
}
```

---

## 5. Client-Side Image Compression & Validation Pipeline (<= 1MB)

Requirement **R2** dictates:
> *"El sistema debe asegurar que las imágenes pesen máximo 1 MB (comprimiéndolas o validándolas) antes de subirlas a Firebase."*

### 5.1. Multi-Tier Defense-in-Depth Pipeline

```
[User selects image file via UI]
                 │
                 ▼
[Tier 1: Pre-Validation]
 - Check file type: image/jpeg, image/png, image/webp, image/jpg
 - Reject invalid formats immediately
                 │
                 ▼
[Tier 2: Size Inspection & Decision]
 - Is file.size <= 1,048,576 bytes (1 MB)?
    ├── YES: Proceed to upload (or optional lossless WebP optimization)
    └── NO: Trigger Auto-Compression Engine
                 │
                 ▼
[Tier 3: Client-Side Compression Engine]
 - Primary: `browser-image-compression` library
   - Options: maxSizeMB: 0.95, maxWidthOrHeight: 1920, useWebWorker: true
 - Fallback: Embedded HTML5 Canvas step-down compressor
   - Iterative scale/quality reduction (0.9 -> 0.75 -> 0.6)
                 │
                 ▼
[Tier 4: Post-Compression Strict Verification Barrier]
 - Assert: compressedFile.size <= 1,048,576 bytes
 - If STILL > 1MB: Halt upload, show clear Spanish error:
   "La imagen es demasiado pesada y no pudo comprimirse a menos de 1 MB. Por favor seleccione otra imagen."
                 │
                 ▼
[Tier 5: Cloud Storage Security Rules]
 - Server-side enforcement: `request.resource.size <= 1048576`
```

### 5.2. Core Implementation (`lib/utils/imageCompression.ts`)

```typescript
import imageCompression from 'browser-image-compression';

export const MAX_IMAGE_SIZE_BYTES = 1048576; // Exactly 1 MB

export interface CompressionResult {
  file: File | Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  previewUrl: string;
}

export async function processDishImage(rawFile: File): Promise<CompressionResult> {
  // 1. Format validation
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!validTypes.includes(rawFile.type)) {
    throw new Error('Formato no válido. Solo se admiten imágenes JPG, PNG o WebP.');
  }

  const originalSize = rawFile.size;

  // 2. If already <= 1 MB, return early
  if (originalSize <= MAX_IMAGE_SIZE_BYTES) {
    return {
      file: rawFile,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1.0,
      previewUrl: URL.createObjectURL(rawFile),
    };
  }

  // 3. Compress if > 1 MB
  try {
    const options = {
      maxSizeMB: 0.95, // Target just below 1 MB for safety margin
      maxWidthOrHeight: 1920,
      useWebWorker: typeof window !== 'undefined' && !!window.Worker,
      fileType: 'image/webp',
    };

    const compressedBlob = await imageCompression(rawFile, options);

    // 4. Strict post-check
    if (compressedBlob.size > MAX_IMAGE_SIZE_BYTES) {
      // Secondary fallback to Canvas compression if browser-image-compression exceeded 1MB
      const canvasCompressed = await compressWithCanvas(rawFile, MAX_IMAGE_SIZE_BYTES);
      if (canvasCompressed.size > MAX_IMAGE_SIZE_BYTES) {
        throw new Error('La imagen excede el límite máximo de 1 MB tras la compresión.');
      }
      return {
        file: canvasCompressed,
        originalSize,
        compressedSize: canvasCompressed.size,
        compressionRatio: canvasCompressed.size / originalSize,
        previewUrl: URL.createObjectURL(canvasCompressed),
      };
    }

    return {
      file: compressedBlob,
      originalSize,
      compressedSize: compressedBlob.size,
      compressionRatio: compressedBlob.size / originalSize,
      previewUrl: URL.createObjectURL(compressedBlob),
    };
  } catch (err) {
    // If library fails (e.g. in test environments without web workers), use canvas fallback
    const fallbackBlob = await compressWithCanvas(rawFile, MAX_IMAGE_SIZE_BYTES);
    return {
      file: fallbackBlob,
      originalSize,
      compressedSize: fallbackBlob.size,
      compressionRatio: fallbackBlob.size / originalSize,
      previewUrl: URL.createObjectURL(fallbackBlob),
    };
  }
}
```

---

## 6. Pricing Engine & Customer Showcase (R3)

Requirement **R3** dictates:
> *"El cliente debe poder navegar por el catálogo bajo la marca 'Platito', ver los precios finales (que son el costo base + el margen de la plataforma) y simular la compra de un producto."*

### 6.1. Mathematical Formula & Confidentiality
- **Formula**:
  $$\text{Precio Final} = \text{Costo Base} \times \left(1 + \frac{\text{Margen \%}}{100}\right)$$
  *(Rounded to whole currency units or standard 2 decimals)*.
- **Provider View (`/provider`)**: Shows `baseCost`, margin indication, and resulting calculated `finalPrice`.
- **Customer View (`/`)**: Displays **only** the `finalPrice` under the unified "Platito" brand. `baseCost` is never shown to the customer, upholding marketplace white-label confidentiality.

### 6.2. Pure Function Specification (`lib/utils/pricing.ts`)
```typescript
export interface PricingConfig {
  markupPercentage: number; // e.g. 20 for 20%
}

export const DEFAULT_MARKUP_PERCENTAGE = 20;

export function calculateFinalPrice(baseCost: number, markupPercentage: number = DEFAULT_MARKUP_PERCENTAGE): number {
  if (baseCost < 0) {
    throw new Error('El costo base no puede ser negativo.');
  }
  const markupMultiplier = 1 + markupPercentage / 100;
  return Math.round(baseCost * markupMultiplier);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}
```

---

## 7. Recommended Directory Structure

The following project structure maps all functional modules, route groups, services, tests, and configuration:

```
d:/platito/
├── app/
│   ├── (storefront)/              # Customer Route Group (Platito Brand)
│   │   ├── page.tsx               # Public Catalog Showcase (Vitrina Unificada)
│   │   ├── cart/
│   │   │   └── page.tsx           # Cart review & purchase simulation
│   │   └── layout.tsx             # Storefront layout (Platito Navbar, Cart button, Footer)
│   ├── provider/                  # Provider Portal
│   │   ├── page.tsx               # Dish management, Base cost editor, Availability toggle
│   │   └── layout.tsx             # Provider layout (Management header, Quick metrics)
│   ├── api/                       # Next.js Route Handlers
│   │   ├── dishes/
│   │   │   └── route.ts           # Optional REST endpoint for dishes
│   │   └── orders/
│   │       └── route.ts           # Simulated order logging
│   ├── layout.tsx                 # Root layout (Fonts, Providers, Toast container)
│   ├── globals.css                # Tailwind CSS root styling
│   └── favicon.ico
├── components/
│   ├── customer/
│   │   ├── DishCard.tsx           # Customer dish card showing final price, Platito branding, add button
│   │   ├── CatalogGrid.tsx        # Filterable catalog (by category, availability)
│   │   ├── CartDrawer.tsx         # Slide-over cart preview
│   │   └── SimulatedCheckoutModal.tsx # Simulated checkout modal with customer contact form
│   ├── provider/
│   │   ├── DishFormModal.tsx      # Add/Edit dish modal with image upload & preview
│   │   ├── DishTable.tsx          # Interactive table with availability toggle & base cost edit
│   │   └── ImageUploader.tsx      # Drag-and-drop image selector with <= 1MB compression meter
│   └── shared/
│       ├── Navbar.tsx             # Navigation with brand logo and role switch
│       ├── Badge.tsx              # Availability and category badges
│       └── Toast.tsx              # Action feedback notifications
├── lib/
│   ├── firebase/
│   │   ├── config.ts              # Firebase client initialization
│   │   ├── firestore.ts           # Firestore direct collection accessors
│   │   └── storage.ts             # Cloud Storage upload helpers
│   ├── services/
│   │   ├── dishService.ts         # Unified service: Firebase or In-Memory Mock
│   │   ├── orderService.ts        # Purchase simulation persistence
│   │   └── storageService.ts      # Image upload handler with local/remote routing
│   ├── utils/
│   │   ├── pricing.ts             # Pricing engine (calculateFinalPrice)
│   │   ├── imageCompression.ts    # Compression & validation pipeline (<= 1MB)
│   │   └── formatters.ts          # Currency & date formatters
│   └── store/
│       └── cartStore.ts           # Zustand store for shopping cart state
├── types/
│   ├── dish.ts                    # Dish, CreateDishDTO, UpdateDishDTO interfaces
│   ├── cart.ts                    # CartItem, CartState interfaces
│   └── order.ts                   # Order, OrderItem, CustomerInfo interfaces
├── tests/
│   ├── unit/
│   │   ├── pricing.test.ts        # Unit test: baseCost + markup calculation
│   │   ├── imageCompression.test.ts # Unit test: <= 1MB validation and compression
│   │   ├── cart.test.ts           # Unit test: cart state, quantity manipulation, totals
│   │   └── dishService.test.ts    # Unit test: provider dish creation & database save
│   └── e2e/
│       ├── provider-workflow.spec.ts # E2E: Provider creates dish, updates cost, toggles availability
│       └── customer-journey.spec.ts  # E2E: Customer views final price, adds to cart, simulates order
├── firestore.rules                # Firestore security rules
├── storage.rules                  # Firebase Cloud Storage security rules (<= 1MB)
├── firebase.json                  # Firebase configuration
├── vitest.config.ts               # Vitest configuration for unit & integration tests
├── playwright.config.ts           # Playwright E2E configuration using Chrome channel
├── tailwind.config.ts             # Tailwind CSS theme configuration
├── tsconfig.json                  # TypeScript compiler settings
├── package.json                   # Project manifest & npm scripts
└── .env.example                   # Environment variable template
```

---

## 8. Package Manifest & Dependencies

Recommended `package.json` manifest:

```json
{
  "name": "platito",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:all": "vitest run && playwright test"
  },
  "dependencies": {
    "next": "^14.2.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "firebase": "^11.0.1",
    "browser-image-compression": "^2.0.2",
    "lucide-react": "^0.453.0",
    "zustand": "^4.5.5",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.4"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "@types/node": "^20.17.0",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "tailwindcss": "^3.4.14",
    "postcss": "^8.4.47",
    "autoprefixer": "^10.4.20",
    "vitest": "^2.1.3",
    "@testing-library/react": "^16.0.1",
    "@testing-library/jest-dom": "^6.6.2",
    "jsdom": "^25.0.1",
    "@playwright/test": "^1.48.1",
    "eslint": "^8.57.1",
    "eslint-config-next": "^14.2.15"
  }
}
```

---

## 9. QA & Testing Harness Implementation Plan

Acceptance Criteria from `ORIGINAL_REQUEST.md`:
1. `[ ] Existen pruebas automáticas que verifican con éxito que un proveedor puede guardar un plato en la base de datos.`
2. `[ ] Existen pruebas automáticas que verifican que un cliente ve el precio final correcto y puede agregarlo al carrito.`
3. `[ ] Se han implementado reglas de seguridad para que los datos estén protegidos.`
4. `[ ] Un agente inspector independiente verifica que la página carga correctamente y es visualmente funcional.`

### 9.1. Unit & Integration Testing (Vitest)
- **`pricing.test.ts`**:
  - Validates `calculateFinalPrice(1000, 20) === 1200`.
  - Tests boundary conditions: $0 base cost, fractional costs, negative inputs rejection.
- **`imageCompression.test.ts`**:
  - Validates that images $\le 1\text{ MB}$ pass without loss.
  - Validates that oversized images $> 1\text{ MB}$ are compressed to $\le 1\text{ MB}$.
  - Validates non-image files (e.g. `.pdf`, `.txt`) are strictly rejected.
- **`cart.test.ts`**:
  - Validates adding items, incrementing quantities, price summation (`quantity * finalPrice`), removing items, clearing cart.
- **`dishService.test.ts`**:
  - Validates that a provider can execute `dishService.createDish(...)`, persisting the dish with `baseCost`, and subsequently retrieving it.
  - Directly satisfies Acceptance Criterion 1.

### 9.2. E2E Browser Testing (Playwright)
- Configured to use system Google Chrome (`channel: 'chrome'`).
- **Provider E2E Scenario**:
  - Open `/provider`.
  - Fill dish form: Name `"Milanesa Napolitana con Fritas"`, Base Cost `3500`, select image, toggle available `true`.
  - Click "Guardar plato".
  - Verify dish appears in provider table.
- **Customer E2E Scenario**:
  - Open `/` (Vitrina Platito).
  - Verify dish is listed under "Platito" brand with calculated final price ($3500 + 20% = $4200).
  - Verify `baseCost` is **NOT** visible anywhere in the customer DOM.
  - Click "Agregar al carrito".
  - Open cart, verify item and total ($4200).
  - Click "Simular compra", fill contact info, submit.
  - Verify simulated order confirmation modal appears with order ID and summary.
  - Directly satisfies Acceptance Criterion 2.

### 9.3. Independent Visual / Functional Inspector Protocol
The test script and manual verification protocol for the independent inspector agent:
1. Start dev server: `npm run dev`.
2. Inspect homepage `http://localhost:3000`:
   - Verify page renders Platito branding, header, dish catalog grid, and active cart toggle.
   - Verify zero unhandled console errors (`console.error`).
3. Inspect provider panel `http://localhost:3000/provider`:
   - Verify dish management UI loads, modal opens, base cost inputs accept numeric values.
4. Verify responsive viewports (Mobile 375x667, Desktop 1280x800).
5. Directly satisfies Acceptance Criterion 4.

---

## 10. Summary of Architectural Consensus with Peer Explorers

Our technical stack analysis was cross-referenced and synthesized with `survey_spec_miner` and `survey_arch_qa`:
- **Consensus on 1MB Constraint**: All three explorers agree on dual client-side compression/validation + Cloud Storage security rule enforcement.
- **Consensus on Host Java Limitation**: Confirmed that Java is absent on the host machine; all explorers align on the necessity of an in-memory/mock repository adapter so that automated tests (`npm test`) execute deterministically without external infrastructure.
- **Consensus on Pricing & White-Label**: Customer sees solely the computed final price under the Platito brand, preserving white-label confidentiality.
