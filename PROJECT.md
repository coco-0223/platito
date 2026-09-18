# Project: Platito MVP (White-Label Gastronomic Marketplace)

## Architecture

Platito is a white-label culinary marketplace where food entrepreneurs upload and manage their dish catalogs, and customers browse anonymously and order under the unified "Platito" brand. The platform owner manages personal delivery logistics and sets the platform markup.

### Architectural Tiers:
1. **Frontend Presentation (Next.js 14 App Router / React / TypeScript / Tailwind CSS)**:
   - `(storefront)` route group: Customer-facing anonymous showcase (`/`), dish details, cart drawer, and simulated checkout (`/checkout`).
   - `provider` route: Entrepreneur management portal (`/provider`) for dish creation, base cost definition, image upload with strict $\le 1\text{ MB}$ compression, and availability toggles.
   - `admin` route: Platform owner logistics dashboard (`/admin/orders`) for reviewing incoming simulated orders for manual delivery.
2. **Business Logic & Pricing Engine (`lib/utils/pricing.ts`)**:
   - Pure, deterministic calculation: `finalPrice = baseCost + platformMarkup`.
   - Complete confidentiality: `baseCost` is kept strictly within provider/internal domain; customer storefront only receives and displays `finalPrice`.
3. **Media Pipeline (`lib/utils/imageCompression.ts`)**:
   - Dual-barrier enforcement of $\le 1\text{ MB}$:
     - Client-side pre-upload compression via Canvas / `browser-image-compression` targeting $< 1\text{ MB}$.
     - Validation guard blocking any payload $> 1,048,576$ bytes.
     - Cloud Storage security rules enforcing `request.resource.size <= 1048576`.
4. **Data Access & Resilient Adapter (`lib/services/`)**:
   - Interface abstraction (`DishService`, `StorageService`, `OrderService`).
   - Dual implementations:
     - **Firebase Live Adapter**: Connects to Cloud Firestore & Cloud Storage when `.env.local` is configured.
     - **Resilient In-Memory / Local Adapter**: Pre-seeded with realistic culinary catalog, providing 100% deterministic test passes (Vitest) and instant zero-config preview without requiring Java emulators.
5. **Security Rules (`firestore.rules`, `storage.rules`)**:
   - Firestore: Enforces schema validation, positive base costs, public read for available dishes, and prevents unauthorized data corruption.
   - Storage: Enforces maximum size $\le 1\text{ MB}$ and image MIME types.

---

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Provider Dish Form | Form to input name, description, category, base cost, availability, and image | M2 | R2 |
| 2 | Base Cost Validation | Validation ensuring base cost is positive numeric value | M2 | R2 |
| 3 | Availability Toggle | Switch/checkbox to manage dish active/inactive status in showcase | M2 | R2 |
| 4 | Image Validation & Compression ($\le 1\text{ MB}$) | Client-side compression and validation blocking any image $> 1\text{ MB}$ | M1, M2 | R2 |
| 5 | Provider Catalog Management | List, view, and toggle availability of uploaded provider dishes | M2 | R2 |
| 6 | Cloud Storage Upload | Service to upload dish images to Firebase Storage | M1, M2 | R1, R2 |
| 7 | Cloud Storage Security Rules | Storage rule strictly rejecting uploads $> 1\text{ MB}$ and non-images | M1 | R2, AC3 |
| 8 | Pricing Engine Arithmetic | Pure function `calculateFinalPrice(baseCost, markup)` | M1 | R3, AC2 |
| 9 | Platform Markup Configuration | Platform owner markup definition (default 20%) | M1, M4 | R3 |
| 10 | Customer Vitrina Storefront | Anonymous catalog browsing under "Platito" brand | M3 | R3 |
| 11 | Final Price Customer View | Showcase displaying only final price, hiding provider base cost | M3 | R3, AC2 |
| 12 | Dish Detail Modal / Card | High-quality dish presentation with description and badges | M3 | R3 |
| 13 | Search & Category Filters | Real-time filtering by dish category and search term | M3 | R3 |
| 14 | Shopping Cart State | Persistent client cart (add, remove, change quantities, calculate total) | M4 | R3, AC2 |
| 15 | Cart Drawer & Counter | UI drawer showing items, unit final prices, subtotal, and checkout trigger | M4 | R3 |
| 16 | Simulated Checkout Form | Delivery details form (name, phone, address, delivery notes) | M4 | R3 |
| 17 | Order DB Persistence | Storing simulated order in database with status PENDING_DELIVERY | M4 | R3, AC1 |
| 18 | Order Confirmation View | Order confirmation screen with order summary and status | M4 | R3 |
| 19 | Platform Logistics Dashboard | Orders view for platform owner to coordinate personal deliveries | M4 | R1, R3 |
| 20 | Firestore Security Rules | Rules safeguarding dishes, orders, and configuration | M1 | AC3 |
| 21 | Automated DB & Pricing Tests | Automated test suite verifying provider dish save & customer cart/pricing | M1, M5 | AC1, AC2 |
| 22 | E2E Browser & Visual Inspection | Playwright E2E suite and protocol for independent visual inspection | E2E, M5 | AC4 |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Foundation & Shared Services | Project scaffold (Next.js, TS, Tailwind), types, Pricing Engine, Image Compressor ($\le 1\text{MB}$), Resilient DB/Storage Adapters, Security Rules, Vitest setup & unit tests | none | PLANNED |
| M2 | Provider Panel & Catalog Management | `/provider` UI, dish creation form, image upload with client compression, catalog listing, availability toggle, integration with `dishService` | M1 | PLANNED |
| M3 | Customer Showcase (Vitrina) & Pricing | Platito storefront `/`, dish cards & modal, category filtering, search, final price display with strict base cost confidentiality | M1 | PLANNED |
| M4 | Cart, Simulated Checkout & Logistics | Cart store, drawer UI, simulated checkout form, order creation in DB, order confirmation, platform owner orders view `/admin/orders` | M1, M3 | PLANNED |
| M5 | Final Milestone: 100% E2E Test Pass & Hardening | Phase 1: Pass 100% E2E tests (Tiers 1-4). Phase 2: Adversarial coverage hardening (Tier 5) with Challenger verification | M1, M2, M3, M4, E2E Track | PLANNED |

In Parallel:
- **E2E Testing Track**: Independent opaque-box test suite derivation (Tiers 1–4) running in parallel, producing `TEST_INFRA.md` and publishing `TEST_READY.md`.

---

## Interface Contracts

### 1. Pricing Engine Contract (`lib/utils/pricing.ts`)
```typescript
export interface PricingConfig {
  markupPercentage: number; // e.g. 20 for 20%
  fixedFee?: number;
}

export function calculateFinalPrice(baseCost: number, markupPercentage: number = 20): number;
export function calculateCartTotals(items: CartItem[], markupPercentage: number = 20): { subtotal: number; total: number };
```

### 2. Image Compression Contract (`lib/utils/imageCompression.ts`)
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

### 3. Dish Domain & Service Contract (`types/dish.ts` & `lib/services/dishService.ts`)
```typescript
export interface Dish {
  id: string;
  providerId: string;
  name: string;
  description: string;
  category: string;
  baseCost: number;
  available: boolean;
  imageUrl: string;
  createdAt: number;
  updatedAt: number;
}

export interface CustomerDishView {
  id: string;
  name: string;
  description: string;
  category: string;
  finalPrice: number;
  available: boolean;
  imageUrl: string;
}

export interface IDishService {
  saveDish(dish: Omit<Dish, 'id' | 'createdAt' | 'updatedAt'>): Promise<Dish>;
  updateDish(id: string, updates: Partial<Dish>): Promise<Dish>;
  getDishes(): Promise<Dish[]>;
  getAvailableCustomerDishes(markupPct: number): Promise<CustomerDishView[]>;
  deleteDish(id: string): Promise<boolean>;
}
```

### 4. Order & Checkout Contract (`types/order.ts` & `lib/services/orderService.ts`)
```typescript
export interface OrderItem {
  dishId: string;
  name: string;
  finalPrice: number;
  quantity: number;
  subtotal: number;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  notes?: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  customer: CustomerInfo;
  status: 'PENDING_DELIVERY' | 'CONFIRMED' | 'DELIVERED';
  createdAt: number;
}

export interface IOrderService {
  createOrder(items: OrderItem[], customer: CustomerInfo, total: number): Promise<Order>;
  getOrders(): Promise<Order[]>;
  updateOrderStatus(orderId: string, status: Order['status']): Promise<Order>;
}
```

---

## Code Layout

```
d:/platito/
├── app/
│   ├── (storefront)/
│   │   ├── page.tsx               # Platito customer showcase (Vitrina)
│   │   ├── layout.tsx             # Storefront layout (Platito header, cart button)
│   │   └── checkout/
│   │       └── page.tsx           # Simulated checkout & order confirmation
│   ├── provider/
│   │   ├── page.tsx               # Provider portal (dish upload, base cost, availability)
│   │   └── layout.tsx             # Provider layout
│   ├── admin/
│   │   └── orders/
│   │       └── page.tsx           # Platform owner logistics / delivery management
│   ├── api/                       # Next.js route handlers
│   ├── globals.css                # Tailwind CSS styling
│   └── layout.tsx                 # Root HTML layout
├── components/
│   ├── storefront/
│   │   ├── DishCard.tsx           # Customer dish card (shows finalPrice only)
│   │   ├── DishModal.tsx          # Detail modal
│   │   ├── VitrinaHeader.tsx      # Platito branding header
│   │   ├── CategoryFilter.tsx     # Categories & search bar
│   │   └── CartDrawer.tsx         # Shopping cart flyout
│   ├── provider/
│   │   ├── DishUploadForm.tsx     # Form with <=1MB image compression & base cost
│   │   ├── DishCatalogTable.tsx   # Provider list & availability toggles
│   │   └── ImageDropzone.tsx      # Image selector with compression progress
│   └── ui/                        # Reusable buttons, badges, inputs
├── lib/
│   ├── firebase/
│   │   └── config.ts              # Firebase client initialization
│   ├── services/
│   │   ├── dishService.ts         # Resilient dish repository (Live Firestore + In-Memory)
│   │   ├── storageService.ts      # Cloud Storage + local dataURL storage
│   │   └── orderService.ts        # Order management service
│   ├── utils/
│   │   ├── pricing.ts             # calculateFinalPrice, calculateCartTotals
│   │   └── imageCompression.ts    # validateAndCompressImage (strict <= 1MB)
│   └── context/
│       └── CartContext.tsx        # React context for shopping cart
├── types/
│   ├── dish.ts                    # Dish interfaces
│   ├── cart.ts                    # Cart interfaces
│   ├── order.ts                   # Order interfaces
│   └── platform.ts                # Platform settings interfaces
├── tests/
│   ├── unit/
│   │   ├── pricing.test.ts        # Pricing markup arithmetic tests
│   │   ├── imageCompression.test.ts # <= 1MB compression & rejection tests
│   │   ├── cart.test.ts           # Cart state tests
│   │   └── dishService.test.ts    # Automated DB dish save tests
│   └── e2e/
│       ├── storefront.spec.ts     # Catalog, final price & cart E2E tests
│       ├── provider.spec.ts       # Provider dish save & availability E2E tests
│       └── checkout.spec.ts       # Simulated checkout E2E tests
├── firestore.rules                # Database security rules
├── storage.rules                  # Storage security rules (enforcing <= 1MB)
├── package.json                   # Dependencies & scripts
├── tsconfig.json                  # TypeScript config
├── tailwind.config.ts             # Tailwind config
└── vitest.config.ts               # Vitest config
```
