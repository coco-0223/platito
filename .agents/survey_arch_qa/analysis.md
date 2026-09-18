# System Architecture, Data Schema, Security Rules & QA Strategy — Platito MVP

**Author**: survey_arch_qa (Architecture & QA Explorer)  
**Date**: 2026-09-17  
**Target Project**: Platito — White-Label Gastronomic Marketplace  
**Source Document**: `d:\platito\ORIGINAL_REQUEST.md`  

---

## 1. Executive Architectural Overview & High-Level Topology

Platito is a white-label gastronomic marketplace connecting local food entrepreneurs/providers with customers under a single unified brand. 
- **Customer Experience**: Anonymous, frictionless browsing of gastronomic offerings under the "Platito" brand, with transparent composite final prices and simulated checkout.
- **Provider Experience**: Autonomous dashboard for local gastronomic entrepreneurs to publish dishes, set raw base costs (`costo base`), toggle availability, and upload photos constrained to $\le 1\text{ MB}$.
- **Platform Owner Operations**: Fulfillment operator who configures the platform markup margin (`margen de la plataforma`), monitors incoming orders, and personally coordinates delivery logistics.

### 1.1 Architectural Topology Diagram

```
+----------------------------------------------------------------------------------------------------+
|                                    PLATITO CLIENT APPLICATION                                      |
|                                       (Next.js / React)                                            |
|                                                                                                    |
|  +--------------------------------+  +--------------------------------+  +----------------------+  |
|  |     Customer Showcase (Vitrina) |  |        Provider Portal         |  |   Platform Logistics  |  |
|  |          (Anonymous)           |  |      (Gastronomic Vendor)      |  |     (Platform Owner)  |  |
|  |  • Brand Header & Hero         |  |  • Dish Catalog Management     |  |  • Live Order Stream |  |
|  |  • Dish Grid (Final Prices)    |  |  • Base Cost Control           |  |  • Delivery Routing  |  |
|  |  • Cart Drawer & State         |  |  • Availability Toggles        |  |  • Markup Margin     |  |
|  |  • Simulated Checkout Flow     |  |  • Image Compressor (<=1MB)    |  |    Configuration     |  |
|  +--------------------------------+  +--------------------------------+  +----------------------+  |
|                 │                                    │                               │             |
|                 ▼                                    ▼                               ▼             |
|  +-----------------------------------------------------------------------------------------------+ |
|  |                            DOMAIN & APPLICATION SERVICE LAYER                                 |
|  |                                                                                               |
|  |   • PricingEngine (BaseCost + Markup)          • ImageValidationService (<= 1MB constraint)   |
|  |   • CartContext / CartStore (LocalStorage)    • DishRepository (CRUD & Availability)         |
|  |   • OrderService (Simulated Orders)            • PlatformConfigService (Markup / Brand)       |
|  +-----------------------------------------------------------------------------------------------+ |
+──────────────────────────────────────────────────┬─────────────────────────────────────────────────+
                                                   │
                         HTTPS Firebase SDK API / Network Layer
                                                   │
                                                   ▼
+────────────────────────────────────────────────────────────────────────────────────────────────────+
|                                    FIREBASE BACKEND SERVICES                                       |
|                                                                                                    |
|  +---------------------------------------------+  +---------------------------------------------+  |
|  |               CLOUD FIRESTORE               |  |                CLOUD STORAGE                |  |
|  |                                             |  |                                             |  |
|  |  • Collection: dishes                       |  |  • Bucket Path: /dishes/{dishId}/{filename} |  |
|  |  • Collection: orders                       |  |  • Security Rule:                           |  |
|  |  • Collection: platform_settings            |  |    - Size <= 1MB strictly enforced          |  |
|  |  • Security Rules:                          |  |    - MIME type image/*                      |  |
|  |    - Read: Public for active dishes         |  |    - Public read for vitrina assets         |  |
|  |    - Write: Validated provider dish schema  |  |                                             |  |
|  |    - Create: Validated customer order       |  +---------------------------------------------+  |
|  +---------------------------------------------+                                                   |
+----------------------------------------------------------------------------------------------------+
```

### 1.2 Architectural Principles & Boundaries
1. **Clean Service Layer Abstraction**: UI components never make direct, unabstracted calls to Firebase SDK. All database and storage interactions are mediated through domain services (`DishService`, `OrderService`, `StorageService`, `PricingEngine`). This decouples UI from persistence, enabling deterministic unit testing, mocking, and offline testing without live Firebase dependencies.
2. **Confidentiality by Separation**: Customers never see supplier base costs or margin breakdowns. The customer-facing view model displays exclusively `finalPrice`.
3. **Frictionless Anonymous Purchase**: Customer ordering does not require authentication or account creation. A simulated order is dispatched directly with customer contact/delivery coordinates.
4. **Two-Tier Enforcement for Media Constraints**: 
   - Tier 1 (Client): Automatic canvas compression and client-side pre-upload validation ensuring files $\le 1\text{ MB}$.
   - Tier 2 (Infrastructure): Firebase Storage Security Rules rejecting any payload $> 1\text{ MB}$ or non-image MIME types.

---

## 2. Domain Data Models & Firestore Schemas

### 2.1 Collection: `dishes`
Represents gastronomic offerings published by entrepreneurs.

#### TypeScript Interface
```typescript
export interface Dish {
  id: string;                      // Firestore Document ID (auto-generated)
  providerId: string;              // Identifier for provider (e.g. "prov_la_casona" or UUID)
  providerName: string;            // Culinary business name (e.g. "Pizzería La Casona")
  name: string;                    // Name of the dish (e.g. "Pizza Napolitana Especial")
  description: string;             // Gastronomic description, ingredients, notes
  category: 'minutas' | 'pastas' | 'pizzas_empanadas' | 'postres' | 'bebidas' | 'promociones';
  baseCost: number;                // Provider base cost (in local currency, e.g. 4500)
  finalPrice: number;              // Calculated price: baseCost + platformMarkup (e.g. 5400)
  markupPercentage?: number;       // Applied markup percentage (e.g. 20)
  available: boolean;              // Current availability status (true = visible in customer vitrina)
  imageUrl: string;                // Public Cloud Storage HTTPS download URL
  imageStoragePath: string;        // Storage reference path (e.g. "dishes/dish_123_thumb.webp")
  createdAt: number;               // Epoch milliseconds or Firebase Timestamp
  updatedAt: number;               // Epoch milliseconds or Firebase Timestamp
}
```

#### Field Specifications & Validation Rules
| Field | Type | Required | Constraints / Validation | Description |
|---|---|---|---|---|
| `id` | string | Yes | Non-empty alphanumeric | Firestore Document ID |
| `providerId` | string | Yes | String length between 2 and 64 | Unique provider/kitchen identifier |
| `providerName` | string | Yes | String length between 2 and 80 | Display name of the provider kitchen |
| `name` | string | Yes | String length between 2 and 100 | Dish name displayed in catalog |
| `description` | string | Yes | String length between 5 and 500 | Description, ingredients, portion size |
| `category` | string | Yes | Valid enum member | Culinary categorization for filtering |
| `baseCost` | number | Yes | Positive number > 0, max 1,000,000 | Provider production cost |
| `finalPrice` | number | Yes | Number $\ge$ `baseCost` | Calculated retail price |
| `available` | boolean | Yes | Boolean (`true` or `false`) | Toggled by provider to pause sales |
| `imageUrl` | string | Yes | Valid HTTPS URL string | Cloud Storage public image URL |
| `imageStoragePath`| string | Yes | String matching `dishes/*` | Cloud Storage internal reference path |
| `createdAt` | number/Timestamp | Yes | Timestamp $\le$ current request time | Creation timestamp |
| `updatedAt` | number/Timestamp | Yes | Timestamp $\ge$ `createdAt` | Last update timestamp |

#### Firestore Compound Index Requirements
- Collection: `dishes`
  - Fields: `available` (Ascending) + `createdAt` (Descending) — For customer showcase feed.
  - Fields: `providerId` (Ascending) + `createdAt` (Descending) — For provider dashboard listing.

---

### 2.2 Collection: `orders`
Represents simulated purchase orders submitted by anonymous customers for platform owner fulfillment.

#### TypeScript Interface
```typescript
export interface OrderCustomerInfo {
  name: string;                    // Customer full name (e.g. "Lucas Rossi")
  phone: string;                   // Contact phone / WhatsApp (e.g. "+54 9 11 5555-1234")
  address: string;                 // Delivery address (e.g. "Av. Corrientes 1234, 4B")
  notes?: string;                  // Delivery instructions (e.g. "Tocar timbre 4B, sin timbre llamar")
}

export interface OrderItemSnapshot {
  dishId: string;                  // Referenced dish ID
  name: string;                    // Dish name snapshot at order time
  quantity: number;                // Quantity ordered (integer >= 1)
  unitPrice: number;               // Retail finalPrice at order time
  baseCost: number;                // Provider baseCost for platform owner accounting
  subtotal: number;                // unitPrice * quantity
  providerId: string;              // Identifies which kitchen must prepare this item
  providerName: string;            // Kitchen name for platform owner pickup coordination
}

export interface Order {
  id: string;                      // Firestore Document ID
  orderNumber: string;             // Human-friendly reference (e.g. "PLT-20260918-042")
  customerInfo: OrderCustomerInfo; // Delivery coordinates
  items: OrderItemSnapshot[];      // Ordered item list
  subtotal: number;                // Sum of item subtotals
  deliveryFee: number;             // Delivery charge (0 for MVP or fixed standard fee)
  total: number;                   // Final payable total: subtotal + deliveryFee
  status: 'pending' | 'confirmed' | 'in_preparation' | 'delivering' | 'delivered' | 'cancelled';
  isSimulated: boolean;            // Fixed to true for MVP simulated purchases
  createdAt: number;               // Order timestamp
  updatedAt: number;               // Last status update timestamp
}
```

#### Field Specifications & Validation Rules
| Field | Type | Required | Constraints / Validation | Description |
|---|---|---|---|---|
| `id` | string | Yes | Non-empty alphanumeric | Firestore Document ID |
| `orderNumber` | string | Yes | String format `PLT-YYYYMMDD-XXX` | Short order reference code |
| `customerInfo.name` | string | Yes | String 2–100 chars | Customer name |
| `customerInfo.phone` | string | Yes | String 6–25 chars | Phone for delivery coordination |
| `customerInfo.address` | string | Yes | String 5–200 chars | Physical delivery location |
| `items` | array | Yes | Non-empty list, min 1, max 50 items | Items purchased |
| `items[i].quantity`| number | Yes | Integer $\ge 1$ | Units ordered |
| `items[i].unitPrice`| number | Yes | Number > 0 | Price charged per unit |
| `total` | number | Yes | Number > 0; equals sum of items + deliveryFee | Grand total |
| `status` | string | Yes | Initial status must be `pending` | Logistics lifecycle state |
| `isSimulated` | boolean | Yes | `true` | Explicit indicator of simulated MVP purchase |
| `createdAt` | number/Timestamp | Yes | Request timestamp | Order submission time |

---

### 2.3 Collection: `platform_settings` (Document: `config`)
Singleton configuration document defining global platform business parameters managed by the platform owner.

#### TypeScript Interface
```typescript
export interface PlatformSettings {
  markupType: 'percentage' | 'fixed'; // Pricing calculation strategy
  markupValue: number;                // e.g. 20 (for 20%) or 500 (for $500 fixed)
  currency: string;                   // "ARS" or "$"
  platformName: string;               // "Platito"
  brandTagline: string;               // "Tu comida local favorita, directo a tu mesa"
  ownerContactPhone: string;          // Logistics WhatsApp for urgent issues
  deliveryNotice: string;             // "Entregado personalmente por el equipo de Platito"
  defaultDeliveryFee: number;         // e.g. 0 (free delivery for MVP)
  updatedAt: number;                  // Last settings update timestamp
}
```

---

## 3. Pricing & Markup Engine Architecture

### 3.1 Business Logic & Mathematical Specification
The pricing formula required by R3:
$$\text{Precio Final} = \text{Costo Base} + \text{Margen de la Plataforma}$$

Platito supports two configurable markup modes:
1. **Percentage Markup (Default)**:
   $$\text{Margen} = \text{Costo Base} \times \left(\frac{\text{markupValue}}{100}\right)$$
   $$\text{Precio Final} = \text{Costo Base} \times \left(1 + \frac{\text{markupValue}}{100}\right)$$
   *Example*: Base Cost = \$4,000, Markup = 20% $\rightarrow$ Margin = \$800, Final Price = \$4,800.

2. **Fixed Markup**:
   $$\text{Precio Final} = \text{Costo Base} + \text{markupValue}$$
   *Example*: Base Cost = \$4,000, Markup = \$500 $\rightarrow$ Final Price = \$4,500.

### 3.2 Rounding & Formatting Policies
- Rounding strategy: All calculated prices are rounded to standard integer values (or 2 decimal places if cents are enabled) using standard financial rounding:
  ```typescript
  export function calculateFinalPrice(
    baseCost: number, 
    markupType: 'percentage' | 'fixed' = 'percentage', 
    markupValue: number = 20
  ): number {
    if (baseCost <= 0 || isNaN(baseCost)) {
      throw new Error('Base cost must be a positive number greater than zero.');
    }
    if (markupValue < 0 || isNaN(markupValue)) {
      throw new Error('Markup value cannot be negative.');
    }
    
    let finalPrice = baseCost;
    if (markupType === 'percentage') {
      finalPrice = baseCost * (1 + markupValue / 100);
    } else {
      finalPrice = baseCost + markupValue;
    }
    
    // Round to 2 decimal places or nearest whole integer
    return Math.round(finalPrice * 100) / 100;
  }
  ```

### 3.3 Data Masking & Customer Confidentiality
To protect provider commercial relationships and preserve the white-label model:
- The customer catalog API / view layer strips `baseCost` and `markupPercentage` before rendering dish cards.
- The shopping cart calculations and checkout confirmation display strictly `unitPrice`, `quantity`, and `subtotal`.
- The platform owner operations view displays the full breakdown (`baseCost`, `markup`, `margin profit`) for administrative logistics and supplier payout accounting.

---

## 4. Media Processing & Cloud Storage Architecture (1 MB Constraint)

Requirement R2 mandates:
> "El sistema debe asegurar que las imágenes pesen máximo 1 MB (comprimiéndolas o validándolas) antes de subirlas a Firebase."

### 4.1 Processing Pipeline
```
[User Selects File] ──► [Pre-Validation Gate]
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       File Size <= 1 MB               File Size > 1 MB
               │                               │
               │                               ▼
               │                [Client-Side Canvas Compressor]
               │                - Resize max dim 1600px
               │                - Encode WebP / JPEG (quality 0.85 -> 0.7)
               │                               │
               │                               ▼
               │                       [Post-Compress Check]
               │                               │
               │               ┌───────────────┴───────────────┐
               │               ▼                               ▼
               │          Size <= 1 MB                    Size > 1 MB
               │               │                               │
               └───────────────┼───────────────────────────────┘
                               │                               │
                               ▼                               ▼
                     [Allow Storage Upload]            [UI Error Notification]
                     (Upload to Cloud Storage)         ("Image cannot be reduced <1MB")
```

### 4.2 Client-Side Image Processor Utility Specification
```typescript
export interface ImageValidationResult {
  valid: boolean;
  file: File | Blob;
  sizeBytes: number;
  compressed: boolean;
  error?: string;
}

export const MAX_IMAGE_SIZE_BYTES = 1024 * 1024; // 1,048,576 bytes = 1 MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

/**
 * Validates file MIME type and size, compressing if larger than 1 MB.
 */
export async function validateAndCompressImage(file: File): Promise<ImageValidationResult> {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      file,
      sizeBytes: file.size,
      compressed: false,
      error: `Formato de imagen inválido (${file.type}). Se permiten JPG, PNG y WEBP.`
    };
  }

  // If already under 1MB, accept directly
  if (file.size <= MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: true,
      file,
      sizeBytes: file.size,
      compressed: false
    };
  }

  // Perform canvas-based compression
  try {
    const compressedBlob = await compressImageToTargetSize(file, MAX_IMAGE_SIZE_BYTES);
    if (compressedBlob.size <= MAX_IMAGE_SIZE_BYTES) {
      return {
        valid: true,
        file: compressedBlob,
        sizeBytes: compressedBlob.size,
        compressed: true
      };
    } else {
      return {
        valid: false,
        file,
        sizeBytes: file.size,
        compressed: false,
        error: 'No se pudo comprimir la imagen por debajo de 1 MB. Selecciona una imagen más liviana.'
      };
    }
  } catch (err: any) {
    return {
      valid: false,
      file,
      sizeBytes: file.size,
      compressed: false,
      error: `Error al procesar la imagen: ${err.message}`
    };
  }
}
```

---

## 5. Security Rules Architecture

### 5.1 Cloud Firestore Security Rules (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isValidDish(dish) {
      return dish.name is string && dish.name.size() >= 2 && dish.name.size() <= 100
          && dish.description is string && dish.description.size() <= 1000
          && dish.baseCost is number && dish.baseCost > 0
          && dish.finalPrice is number && dish.finalPrice >= dish.baseCost
          && dish.available is bool
          && dish.imageUrl is string && dish.imageUrl.matches('^https://.*');
    }

    function isValidOrder(order) {
      return order.customerInfo is map
          && order.customerInfo.name is string && order.customerInfo.name.size() >= 2
          && order.customerInfo.phone is string && order.customerInfo.phone.size() >= 6
          && order.customerInfo.address is string && order.customerInfo.address.size() >= 5
          && order.items is list && order.items.size() > 0 && order.items.size() <= 50
          && order.total is number && order.total > 0
          && order.status == 'pending'
          && order.isSimulated == true;
    }

    // 1. Dishes Collection
    match /dishes/{dishId} {
      // Vitrina allows public read so anonymous customers can view dishes
      allow read: if true;

      // Provider dish creation with schema validation
      allow create: if isValidDish(request.resource.data);

      // Provider dish update (availability toggle, price change, details)
      allow update: if isValidDish(request.resource.data);

      // Delete allowed for provider catalog management
      allow delete: if true;
    }

    // 2. Orders Collection
    match /orders/{orderId} {
      // Anonymous customer can create simulated orders with strict schema validation
      allow create: if isValidOrder(request.resource.data);

      // Orders read allowed for platform owner delivery fulfillment
      allow read: if true;

      // Orders are immutable once placed by customers
      allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'updatedAt']);
      allow delete: if false;
    }

    // 3. Platform Settings Collection
    match /platform_settings/{configId} {
      // Public read for customer pricing calculations & branding
      allow read: if true;

      // Writes restricted to platform settings updates
      allow write: if request.resource.data.markupValue is number 
                   && request.resource.data.markupValue >= 0;
    }
  }
}
```

### 5.2 Firebase Cloud Storage Security Rules (`storage.rules`)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Dishes photography storage path
    match /dishes/{dishId}/{filename} {
      // Public read for vitrina dish cards
      allow read: if true;

      // Strict enforcement of 1 MB size limit and image MIME type
      allow write: if request.resource.size <= 1048576  // Exactly 1 MB in bytes
                   && request.resource.contentType.matches('image/(jpeg|png|webp|jpg)');
    }

    // Global fallback for dishes root upload
    match /dishes/{filename} {
      allow read: if true;
      allow write: if request.resource.size <= 1048576
                   && request.resource.contentType.matches('image/(jpeg|png|webp|jpg)');
    }
  }
}
```

---

## 6. Frontend & Application Architecture

### 6.1 Framework Choice: Next.js App Router vs React + Vite
| Criterion | Next.js 14+ App Router | React + Vite SPA | Architectural Recommendation |
|---|---|---|---|
| **SSR / Hydration** | SSR + Client Components | Pure Client SPA | Both viable; Next.js App Router provides clean Route Groups `(storefront)`, `(provider)`, `(admin)`. |
| **SEO & Brand Showcase** | Native Metadata API | Requires SSR plugin | Next.js provides polished branding for "Platito". |
| **Build & Tooling Speed** | Fast (Turbopack) | Extremely fast (esbuild) | Next.js standard for production web apps. |
| **Routing Separation** | Folder-based route groups | React Router DOM | Next.js `app/` structure isolates customer vs provider layouts. |
| **Testing Setup** | Vitest + Playwright | Vitest + Playwright | Identical test runner capabilities. |

**Recommendation**: **Next.js 14/15 with App Router**, Tailwind CSS, Lucide React icons, and Firebase Web SDK v10/v11.

### 6.2 Application Directory Structure
```
platito/
├── app/
│   ├── (storefront)/               # Customer vitrina layout & routes
│   │   ├── layout.tsx              # Platito brand header, navigation & cart drawer
│   │   ├── page.tsx                # Hero banner & catalog dish grid
│   │   ├── dish/[id]/page.tsx      # Dish detail view
│   │   ├── cart/page.tsx           # Full cart review page
│   │   └── checkout/page.tsx       # Simulated checkout & order confirmation
│   ├── provider/                   # Provider portal
│   │   ├── layout.tsx              # Provider navigation & status bar
│   │   ├── page.tsx                # Dish listing & availability toggle table
│   │   ├── dishes/new/page.tsx     # Dish creation form with image compressor
│   │   └── dishes/[id]/edit/page.tsx # Dish baseCost & details editor
│   ├── admin/                      # Platform owner logistics portal
│   │   ├── layout.tsx              # Admin layout
│   │   ├── orders/page.tsx         # Live orders board & status manager
│   │   └── settings/page.tsx       # Markup & platform config editor
│   ├── layout.tsx                  # Root layout with CartProvider & ToastProvider
│   └── globals.css                 # Tailwind CSS styles & typography
├── components/
│   ├── ui/                         # Reusable UI primitives (Button, Input, Modal, Badge, Card)
│   ├── storefront/                 # Catalog components (DishCard, DishGrid, CategoryFilter, BrandHero)
│   ├── cart/                       # CartDrawer, CartItemRow, CartSummary, CheckoutModal
│   ├── provider/                   # DishForm, ImageUploadDropzone, AvailabilityToggle
│   └── admin/                      # OrderCard, DeliveryStatusBadge, SettingsForm
├── context/
│   ├── CartContext.tsx             # Client cart state with localStorage persistence
│   └── ConfigContext.tsx           # Platform markup & settings state
├── lib/
│   ├── firebase/
│   │   ├── client.ts               # Firebase App, Firestore & Storage initialization
│   │   └── config.ts               # Env-based Firebase configuration
│   ├── services/
│   │   ├── dish.service.ts         # Firestore CRUD operations for dishes
│   │   ├── order.service.ts        # Order dispatch and retrieval
│   │   ├── storage.service.ts      # Cloud Storage image upload wrapper
│   │   └── config.service.ts       # Platform settings loader & updater
│   ├── utils/
│   │   ├── pricing.ts              # Pricing markup calculation logic
│   │   ├── image.ts                # Image compression (< 1MB) & validation
│   │   └── format.ts               # Currency, phone, date formatters
│   └── types/
│       └── index.ts                # Dish, Order, CartItem, PlatformSettings types
├── tests/
│   ├── unit/
│   │   ├── pricing.test.ts         # Vitest: markup arithmetic & rounding
│   │   ├── image.test.ts           # Vitest: image size & mime validations
│   │   └── cart.test.ts            # Vitest: cart add, update, remove, total
│   ├── integration/
│   │   └── dish-service.test.ts    # Automated test: provider saving dish in DB
│   └── e2e/
│       ├── catalog.spec.ts         # Playwright: catalog browsing & final prices
│       ├── cart-checkout.spec.ts   # Playwright: add to cart & simulated checkout
│       └── provider-flow.spec.ts   # Playwright: provider dish creation & availability
├── firestore.rules                 # Cloud Firestore security rules
├── storage.rules                   # Cloud Storage security rules
├── firebase.json                   # Firebase CLI project configuration
├── playwright.config.ts            # Playwright E2E configuration
└── vitest.config.ts                # Vitest test configuration
```

### 6.3 State Management Strategy
1. **Cart Context (`useCart`)**:
   - Manages an array of `CartItem` objects.
   - Synchronizes automatically to `localStorage` key `'platito_cart'`.
   - Hydrates safely on client mount with SSR hydration-error prevention.
   - Actions: `addItem`, `removeItem`, `updateQuantity`, `clearCart`.
   - Computed properties: `totalItemsCount`, `subtotalAmount`, `grandTotalAmount`.
2. **Catalog Data Access (`useDishes`)**:
   - Queries `dishes` collection where `available == true`.
   - Real-time updates via `onSnapshot` for instant reflection when providers change availability or prices.
3. **Provider Portal State**:
   - Displays all dishes belonging to the active provider.
   - Optimistic UI updates when toggling availability switch.

---

## 7. Multi-Tier QA & Testing Strategy

To satisfy all Acceptance Criteria in `ORIGINAL_REQUEST.md`, Platito requires a comprehensive 4-Tier verification strategy:

```
+-----------------------------------------------------------------------------------------------+
|                                 QA & VERIFICATION MATRIX                                      |
+-----------------------------------------------------------------------------------------------+
| Tier 1: Unit & Integration Tests (Vitest)                                                    |
|   • Markup Pricing Engine (percentage, fixed, edge cases, rounding)                           |
|   • Image Validation & Compression Utility (<= 1MB check, MIME types)                         |
|   • Cart Operations (add, remove, quantity update, total aggregation)                         |
+-----------------------------------------------------------------------------------------------+
| Tier 2: Automated Firebase Database Tests                                                      |
|   • Provider Dish Persistence (create dish, assert saved in DB, verify fields)                 |
|   • Dish Retrieval & Availability Toggle verification in DB                                   |
|   • Resilient test harness: works with live Firebase test credentials OR in-memory mock DB   |
+-----------------------------------------------------------------------------------------------+
| Tier 3: End-to-End (E2E) Browser Test Harness (Playwright)                                   |
|   • Executed via installed Windows Chrome / Edge browsers                                     |
|   • Test 1: Vitrina catalog browsing & final price verification                               |
|   • Test 2: Add to cart, quantity manipulation, cart badge updates                            |
|   • Test 3: Simulated checkout with customer coordinates & confirmation receipt               |
|   • Test 4: Provider portal dish publishing flow & availability switch                        |
+-----------------------------------------------------------------------------------------------+
| Tier 4: Independent Inspector Agent Protocol                                                  |
|   • Headless DOM & Visual verification protocol                                               |
|   • Zero console errors assertion                                                             |
|   • Mobile (375px) and Desktop (1280px) responsive layout verification                       |
|   • White-label "Platito" brand consistency audit                                             |
+-----------------------------------------------------------------------------------------------+
```

### 7.1 Tier 1: Unit & Integration Tests (Vitest)

#### 7.1.1 Pricing Markup Engine Tests (`tests/unit/pricing.test.ts`)
- **Test Cases**:
  1. Percentage markup calculation: `calculateFinalPrice(1000, 'percentage', 20)` equals `1200`.
  2. Fixed markup calculation: `calculateFinalPrice(1000, 'fixed', 350)` equals `1350`.
  3. Zero markup: `calculateFinalPrice(1000, 'percentage', 0)` equals `1000`.
  4. Decimal rounding: `calculateFinalPrice(333.33, 'percentage', 15)` rounds correctly to `383.33`.
  5. Negative base cost throws descriptive Error.
  6. Zero base cost throws descriptive Error.
  7. Negative markup percentage throws descriptive Error.
  8. Missing or null inputs fallback safely to defaults.

#### 7.1.2 Image Validation & Compression Tests (`tests/unit/image.test.ts`)
- **Test Cases**:
  1. File with size 800 KB (under 1 MB) passes validation without requiring compression (`valid: true, compressed: false`).
  2. File with size exactly 1,048,576 bytes (1 MB) passes validation (`valid: true`).
  3. File with size 2.5 MB (over 1 MB) triggers compression pipeline.
  4. Non-image file (e.g. `application/pdf`, `text/html`) is rejected immediately with invalid MIME type error.
  5. Allowed MIME types (`image/jpeg`, `image/png`, `image/webp`) are accepted.
  6. File that cannot be compressed below 1 MB returns `valid: false` with localized Spanish error message.

#### 7.1.3 Cart Operations Tests (`tests/unit/cart.test.ts`)
- **Test Cases**:
  1. Adding a new item initializes quantity to 1 and calculates subtotal correctly.
  2. Adding an existing item increments quantity without duplicating array entries.
  3. Updating quantity to 3 recalculates line subtotal and cart grand total.
  4. Reducing quantity to 0 removes the item from the cart.
  5. Explicit `removeItem` removes the designated item.
  6. `clearCart` empties all items and resets totals to 0.
  7. Aggregation of items with different unit prices computes exact total.
  8. Cart state serializes to JSON and restores cleanly.

---

### 7.2 Tier 2: Automated Firebase Database Tests
Requirement: *"Existen pruebas automáticas que verifican con éxito que un proveedor puede guardar un plato en la base de datos."*

#### Environment & Execution Strategy
- **Observation on Host Environment**: Java is not installed on this system. Firebase CLI emulator (`firebase emulators:start`) requires Java 11+.
- **Architectural Solution**:
  1. Implement a **Database Adapter Pattern** in `lib/services/dish.service.ts`:
     - Standard mode: Uses Firebase Web SDK (`collection`, `addDoc`, `getDoc`, `updateDoc`).
     - Test / In-Memory mode: Uses an in-memory Firestore Mock Adapter that implements identical semantics and method signatures.
  2. Provide two automated test suites:
     - **Integration Test (`tests/integration/dish-service.test.ts`)**: Direct test executing dish document creation, validating ID generation, field persistence, retrieval, and availability toggling.
     - **Live Firebase Test Harness**: Capable of executing against real Firebase test credentials or emulator when available.

#### Test Implementation Outline (`tests/integration/dish-service.test.ts`)
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { DishService } from '@/lib/services/dish.service';
import { Dish } from '@/lib/types';

describe('Firebase Database: Provider Dish Persistence', () => {
  let dishService: DishService;

  beforeEach(() => {
    dishService = new DishService();
  });

  it('successfully creates and saves a provider dish with baseCost in the database', async () => {
    const providerDishInput: Omit<Dish, 'id' | 'createdAt' | 'updatedAt'> = {
      providerId: 'prov_don_pepe',
      providerName: 'Don Pepe Rotisería',
      name: 'Milanesa Napolitana con Papas Fritas',
      description: 'Milanesa de ternera con salsa de tomate, jamón, mozzarella y papas fritas caseras.',
      category: 'minutas',
      baseCost: 5000,
      finalPrice: 6000,
      markupPercentage: 20,
      available: true,
      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/platito.appspot.com/o/dishes%2Fmilanesa.jpg',
      imageStoragePath: 'dishes/milanesa.jpg'
    };

    // 1. Execute dish creation
    const savedDish = await dishService.createDish(providerDishInput);

    // 2. Assert ID generated and returned
    expect(savedDish).toBeDefined();
    expect(savedDish.id).toBeTruthy();
    expect(typeof savedDish.id).toBe('string');

    // 3. Retrieve from database to confirm real persistence
    const fetchedDish = await dishService.getDishById(savedDish.id);
    expect(fetchedDish).not.toBeNull();
    expect(fetchedDish?.name).toBe('Milanesa Napolitana con Papas Fritas');
    expect(fetchedDish?.baseCost).toBe(5000);
    expect(fetchedDish?.finalPrice).toBe(6000);
    expect(fetchedDish?.available).toBe(true);
    expect(fetchedDish?.providerId).toBe('prov_don_pepe');
  });

  it('allows provider to toggle availability in the database', async () => {
    const dish = await dishService.createDish({
      providerId: 'prov_test',
      providerName: 'Test Kitchen',
      name: 'Empanadas de Carne',
      description: 'Carne cortada a cuchillo.',
      category: 'pizzas_empanadas',
      baseCost: 3000,
      finalPrice: 3600,
      available: true,
      imageUrl: 'https://storage.platito/empanada.jpg',
      imageStoragePath: 'dishes/empanada.jpg'
    });

    // Toggle to unavailable
    await dishService.updateDishAvailability(dish.id, false);

    const updatedDish = await dishService.getDishById(dish.id);
    expect(updatedDish?.available).toBe(false);
  });
});
```

---

### 7.3 Tier 3: End-to-End (E2E) Browser Test Harness (Playwright)

#### Host Browser Availability
- Host environment has **Google Chrome** (`C:\Program Files\Google\Chrome\Application\chrome.exe`) and **Microsoft Edge** (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`).
- Playwright can run headlessly or headed using `channel: 'chrome'` or direct executable path, eliminating the need to download external browser binaries.

#### Automated E2E Test Scenarios

##### Scenario 1: Catalog Browsing & Final Price Visibility (`tests/e2e/catalog.spec.ts`)
1. Navigate to `http://localhost:3000/`.
2. Verify page title contains "Platito".
3. Verify white-label brand hero displays "Platito" and delivery notice.
4. Verify catalog dish cards render with dish name, image, description, and **final price** (e.g. `$6.000`).
5. Assert that supplier base cost (`baseCost`) and markup percentages are **NOT** displayed anywhere in the customer DOM.

##### Scenario 2: Cart Addition & Dynamic Calculation (`tests/e2e/cart.spec.ts`)
1. In catalog, click "Agregar al Carrito" on the first available dish.
2. Assert cart badge in header displays "1".
3. Click on cart icon to open Cart Drawer / Modal.
4. Verify dish name, unit price, quantity (1), and total subtotal match expected values.
5. Click "+" button to increment quantity to 2; verify total doubles automatically.
6. Click "Vaciar Carrito" or remove button; verify cart returns to empty state.

##### Scenario 3: Simulated Checkout & Order Confirmation (`tests/e2e/checkout.spec.ts`)
1. Add an item to cart and click "Comprar / Simular Pedido".
2. Navigate to `/checkout` (or open checkout modal).
3. Fill customer input fields:
   - Full Name: "Juan Perez"
   - Phone: "1155551234"
   - Delivery Address: "Calle Falsa 123"
   - Delivery Notes: "Timbre 2A"
4. Click "Confirmar Pedido".
5. Assert order confirmation screen appears with:
   - Unique Order Reference (e.g. `PLT-XXXX`)
   - Order summary with items and final total
   - Friendly logistics banner: "¡Gracias por tu compra! El dueño de Platito se encargará personalmente de la entrega."
6. Assert cart is automatically cleared upon successful order dispatch.

##### Scenario 4: Provider Dish Upload & Availability (`tests/e2e/provider.spec.ts`)
1. Navigate to `/provider`.
2. Click "Nuevo Plato".
3. Complete form with dish name, description, base cost (`$4500`), category, and attach a valid test image ($\le 1\text{ MB}$).
4. Submit form.
5. Verify success toast and dish appears in the provider catalog table.
6. Toggle availability switch from "Disponible" to "Pausado".
7. Verify availability badge changes to "No disponible".

---

### 7.4 Tier 4: Independent Inspector Agent Protocol

The Acceptance Criteria state:
> "Un agente inspector independiente verifica que la página carga correctamente y es visualmente funcional para que luego el usuario la pueda probar manualmente."

#### Inspector Execution Checklist
The inspector agent must follow this reproducible inspection procedure:

1. **Service Readiness Check**:
   - Verify local development server is running and responds with HTTP 200 at `http://localhost:3000/`.
   - Verify no build compilation warnings or unhandled exceptions occurred in the server terminal output.

2. **Headless Browser Console & Error Inspection**:
   - Launch browser to inspect console messages:
     ```typescript
     page.on('console', msg => {
       if (msg.type() === 'error') {
         console.error(`INSPECTOR ERROR DETECTED: ${msg.text()}`);
       }
     });
     page.on('pageerror', exception => {
       throw new Error(`INSPECTOR PAGE EXCEPTION: ${exception.message}`);
     });
     ```
   - Zero uncaught exceptions permitted during any user flow.

3. **Visual Aesthetics & Gastronomic UI Review**:
   - Take full-page viewport screenshots:
     - `screenshot_desktop_catalog.png` (1280x800)
     - `screenshot_mobile_catalog.png` (375x667)
     - `screenshot_cart_drawer.png`
     - `screenshot_checkout_confirmation.png`
     - `screenshot_provider_dashboard.png`
   - Verify layout responsiveness: dish cards grid cleanly wraps on mobile viewports; buttons and inputs are adequately sized for touch targets ($\ge 44\text{px}$).

4. **White-Label & Confidentiality Audit**:
   - Check that "Platito" brand identity is dominant and consistent.
   - Inspect page DOM text to confirm provider production cost (`baseCost`) is not leaked into customer view.
   - Confirm anonymous access: no authentication prompt blocks browsing, cart addition, or simulated order placement.

5. **Functional Interaction Smoke Test**:
   - Perform full interactive run: Browse $\rightarrow$ Add 2 Dishes $\rightarrow$ Modify Quantity $\rightarrow$ Submit Simulated Order $\rightarrow$ Check Receipt $\rightarrow$ Visit Provider Portal $\rightarrow$ Toggle Availability.
   - Confirm each action provides immediate visual feedback (loading spinners, badge updates, toasts).

---

## 8. Milestone Decomposition & Implementation Plan

```
+---------------------------------------------------------------------------------------------------------+
|                                  MILESTONE ROADMAP FOR PLATITO MVP                                      |
+---------------------------------------------------------------------------------------------------------+
| Milestone 1: Project Scaffolding, Domain Core & Unit Tests                                              |
|   • Initialize Next.js project with Tailwind CSS, TypeScript, and Lucide icons                          |
|   • Implement core domain models, PricingEngine, and ImageValidation/Compression utility                |
|   • Implement Tier 1 Unit Tests (pricing arithmetic, image validation, cart operations) via Vitest      |
+---------------------------------------------------------------------------------------------------------+
| Milestone 2: Firebase Integration, Services & Database Automated Tests                                  |
|   • Setup Firebase Client SDK configuration, Firestore, and Cloud Storage                               |
|   • Implement DishService, OrderService, and PlatformSettingsService with robust error handling          |
|   • Implement and verify Tier 2 Automated Database Tests (provider dish creation and retrieval)         |
|   • Deploy/bundle firestore.rules and storage.rules                                                     |
+---------------------------------------------------------------------------------------------------------+
| Milestone 3: Provider Portal & Image Management                                                         |
|   • Build `/provider` dashboard with dish table and availability toggles                                |
|   • Build `/provider/dishes/new` form with client-side image compression & <= 1MB validation            |
|   • Connect form to Cloud Storage upload and Firestore persistence                                      |
+---------------------------------------------------------------------------------------------------------+
| Milestone 4: Customer Vitrina, Cart & Simulated Checkout                                                |
|   • Build `/` white-label Platito vitrina with brand hero, category filters, and dish cards             |
|   • Implement CartContext with localStorage persistence and interactive cart drawer                     |
|   • Implement simulated checkout flow with delivery coordinates and simulated order confirmation receipt |
+---------------------------------------------------------------------------------------------------------+
| Milestone 5: Platform Owner Logistics View & E2E Test Suite                                             |
|   • Build `/admin/orders` logistics board for platform owner order review and status updates            |
|   • Configure and execute Tier 3 Playwright E2E test harness using host Chrome/Edge                     |
|   • Execute Tier 4 Independent Inspector verification protocol with screenshot generation               |
+---------------------------------------------------------------------------------------------------------+
```

---

## 9. Environment & Compatibility Findings

1. **Host Environment**:
   - OS: Windows 10/11
   - Node.js: `v22.20.0`
   - npm: `11.11.0`
   - Git: `2.53.0.windows.2`
   - Firebase CLI: `15.12.0`
   - Installed Browsers: Google Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe`), Microsoft Edge (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`).
2. **Java Runtime Note**:
   - `java` is **not installed** in the system PATH.
   - Implication: Standard Firebase Local Emulator Suite (`@firebase/rules-unit-testing` / `firebase emulators:start`) requires Java.
   - Solution: The architectural test suite uses direct Firebase SDK integration tests with an in-memory/mock fallback adapter for unit/integration tests, and direct Firebase project or Playwright E2E browser automation for complete system validation.
3. **Browser Automation Compatibility**:
   - Playwright runs directly against the installed Google Chrome or Microsoft Edge executables on Windows without requiring heavy browser downloads.
