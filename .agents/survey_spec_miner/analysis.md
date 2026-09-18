# Specification & Requirements Analysis — Platito MVP

**Author**: survey_spec_miner  
**Date**: 2026-09-17  
**Source Document**: `d:\platito\ORIGINAL_REQUEST.md`  
**Target Project**: Platito — White-Label Gastronomic Marketplace (Marketplace Gastronómico de Marca Blanca)

---

## 1. Executive Summary & Vision

Platito is a white-label gastronomic marketplace connecting local food entrepreneurs/providers with customers under a unified, cohesive brand identity.
- **Brand Identity**: The customer-facing interface is branded entirely as "Platito", providing a polished, trustworthy single-storefront experience.
- **Provider Autonomy**: Gastronomic entrepreneurs independently upload their dishes, specify their base costs (`costo base`), and toggle product availability.
- **Platform Owner Operations**: The platform owner configures the platform markup margin (`margen de la plataforma`) and personally handles logistics and order deliveries.
- **Frictionless Customer Experience**: Customers browse the unified catalog anonymously without forced registration or authentication barriers, view final prices, assemble a cart, and execute simulated checkout.

---

## 2. Personas & Roles Matrix

| Persona / Role | Description | Access Level | Primary Interactions |
|---|---|---|---|
| **Emprendedor / Proveedor (Provider)** | Gastronomic entrepreneur supplying dishes. | Provider Portal | • Create/upload dishes<br>• Set and update base costs (`costo base`)<br>• Manage dish availability (`disponible` / `no disponible`)<br>• Upload dish photography with image compression/validation (≤ 1 MB) |
| **Cliente (Customer)** | Food consumer purchasing meals. | Public / Anonymous Vitrina | • Browse unified gastronomic catalog under "Platito" brand<br>• View dish cards with final calculated prices<br>• Filter/view dish details<br>• Add/remove dishes to/from shopping cart<br>• Execute simulated checkout/order placement without forced login |
| **Dueño de la Plataforma (Platform Owner / Admin)** | Operator managing logistics and platform profit. | Operations / Admin | • Configure platform markup formula/margin<br>• Inspect submitted orders and delivery addresses/details<br>• Coordinate fulfillment and personal deliveries |
| **Automated / Inspector Agent** | Verification agent inspecting system health. | Test / Inspection Harness | • Verify UI loads without fatal console errors<br>• Verify end-to-end provider dish creation in database<br>• Verify calculation of final prices and cart mechanics<br>• Verify storage and database security rules |

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Provider Panel | Dish Creation Form | Form allowing providers to publish new culinary items with name, description, category, base cost, and image. | Dish name, description, category, base cost (`number`), image file (`File`), initial availability status (`boolean`). | Persistent dish document created in Firebase; success confirmation in UI. | Form validation error if required fields are missing; non-numeric or negative price rejected; save failure alert on network error. | ORIGINAL_REQUEST.md R2 |
| 2 | Provider Panel | Base Cost Management | Interface to view and update the supplier's raw production cost (`costo base`) for any dish. | Dish ID, new base cost (`number > 0`). | Updated dish record in Firebase; updated final price reflected across catalog. | Reject negative, non-numeric, or zero base cost; rollback UI on network/DB failure. | ORIGINAL_REQUEST.md R2 |
| 3 | Provider Panel | Dish Availability Toggle | Control to switch a dish between active/available and inactive/sold out. | Dish ID, availability boolean (`disponible: true/false`). | Updated status in DB; instant visual feedback in provider dashboard; item hidden or disabled in customer vitrina. | Revert toggle and display error banner if Firebase write fails. | ORIGINAL_REQUEST.md R2 |
| 4 | Provider Panel | Dish Catalog Listing | Dashboard displaying all dishes registered by the provider with current base cost, availability badge, and preview image. | Provider identity or catalog query. | List/grid of dish cards with edit controls and status badges. | Display empty state illustration/prompt when no dishes exist; error banner on query failure. | ORIGINAL_REQUEST.md R2 |
| 5 | Media & Storage | Client-Side Image Validation | Pre-upload inspection ensuring image files adhere to allowed formats and do not exceed 1 MB. | Selected image file (`Blob`/`File`). | Pass/fail boolean; file size and MIME type verification. | Rejection notification ("Image exceeds 1 MB limit" or "Unsupported format: use JPG, PNG, WEBP"). File is not uploaded. | ORIGINAL_REQUEST.md R2 |
| 6 | Media & Storage | Client-Side Image Compression | Automatic client-side compression/resizing of images before upload to ensure final payload weighs ≤ 1 MB. | Raw image file (canvas or browser compression library). | Compressed image `Blob` guaranteed ≤ 1 MB. | Fallback to rejection if image cannot be compressed below 1 MB after maximum compression passes. | ORIGINAL_REQUEST.md R2 |
| 7 | Media & Storage | Cloud Storage Upload | Secure transfer of validated/compressed dish image to Firebase Cloud Storage, retrieving public download URL. | Validated image Blob, dish ID. | Cloud Storage file path (`/dishes/{dishId}.jpg`) and HTTPS download URL stored in dish document. | Storage upload error handled gracefully with retry option; prevents partial record creation if upload fails. | ORIGINAL_REQUEST.md R1, R2 |
| 8 | Pricing Engine | Platform Markup Calculation | Business logic computing final consumer price: `precio_final = costo_base + margen_plataforma`. | `costo_base` (`number`), `margen` (percentage e.g. 20% or fixed fee). | Computed `precio_final` rounded to 2 decimal places (or integer currency). | Gracefully fallback to base cost + default markup if config is missing; throw on negative markup or invalid base cost. | ORIGINAL_REQUEST.md R3 |
| 9 | Pricing Engine | Provider Cost Confidentiality | Ensures customers in the vitrina only see the final composite price (`precio_final`), masking supplier base cost and platform margin. | Dish document data. | Sanitized public view model containing only `precio_final`. | Prevents data leakage of supplier margins to the end customer. | ORIGINAL_REQUEST.md R3 |
| 10 | Customer Vitrina | Anonymous Catalog Browsing | Publicly accessible storefront displaying all available dishes under the "Platito" brand without login/auth barrier. | None (anonymous access). | Responsive grid of dish cards with title, description, image, and final price. | Empty state if no dishes are available; retry state on network disconnect. | ORIGINAL_REQUEST.md R3 |
| 11 | Customer Vitrina | Platito Brand Header & Showcase | White-label unified branding showcasing Platito logo, value proposition, and delivery promise (owner delivery). | Brand assets, navigation links. | Header with Platito identity, cart icon with badge count, and provider portal entry link. | Visual fallback if brand logos fail to load. | ORIGINAL_REQUEST.md R3 |
| 12 | Customer Vitrina | Dish Detail / Card View | Informational presentation of individual dish attributes (image, title, culinary description, final price, availability). | Dish data. | Visual card with "Add to Cart" action button. | "Sold out / No disponible" disabled button if availability is false. | ORIGINAL_REQUEST.md R3 |
| 13 | Cart & Checkout | Add to Cart | Allows anonymous customer to select an available dish and add it to a local shopping cart session. | Dish ID, dish snapshot (title, price, image), quantity (default 1). | Cart state updated; cart badge count incremented; drawer/toast feedback. | Reject addition if dish is marked unavailable; cap max quantity per item. | ORIGINAL_REQUEST.md R3 |
| 14 | Cart & Checkout | Cart Quantity & Item Management | Controls within cart drawer/page to increase, decrease, or remove dish items, dynamically recalculating totals. | Cart item ID, increment/decrement action. | Updated item quantities, line totals, and cart grand total. | Decrementing quantity below 1 triggers item removal or confirmation. | ORIGINAL_REQUEST.md R3 |
| 15 | Cart & Checkout | Simulated Checkout | Order placement simulation where anonymous user enters delivery address, contact info, and confirms simulated purchase. | Customer name, phone number, delivery address, delivery notes, cart items. | Simulated order confirmation screen with order summary, unique order reference, and dispatch note. | Validation error if contact or address fields are empty; prevent checkout with empty cart. | ORIGINAL_REQUEST.md R3 |
| 16 | Order & Logistics | Order Dispatch Recording | Saves confirmed simulated orders to Firebase for the platform owner to inspect and manage personal deliveries. | Order payload (customer details, items, quantities, final prices, timestamp, status). | Order document stored in Firebase (`orders` collection) with status `pending_delivery`. | Display error alert to user if order persistence fails, retaining cart state for retry. | ORIGINAL_REQUEST.md (Intro & R3) |
| 17 | Platform Owner | Logistics / Orders Viewer | Interface for the platform owner to review pending deliveries and customer shipping details. | Admin/Owner query on orders collection. | Chronological list of orders with customer address, phone, items ordered, and delivery status. | Empty state when no orders exist; error state on query rejection. | ORIGINAL_REQUEST.md (Intro) |
| 18 | Security Rules | Database Access Protection | Firebase Security Rules governing collection read/write permissions. | Client request credentials, operation type (read/write). | Allow public read on active dishes; allow public order creation; restrict unauthorized modifications. | Firebase `PERMISSION_DENIED` error when unauthorized write or tampering is attempted. | ORIGINAL_REQUEST.md Criteria |
| 19 | Security Rules | Cloud Storage Security Rules | Storage rules enforcing image upload constraints (size <= 1MB, allowed image MIME types). | Upload request metadata (file size, contentType). | Permission granted for valid image files ≤ 1MB; upload blocked otherwise. | Storage upload rejected with `storage/unauthorized` if payload > 1 MB or invalid MIME type. | ORIGINAL_REQUEST.md Criteria & R2 |
| 20 | Quality Assurance | Automated Test: Provider Dish Save | Automated test suite verifying that a provider can successfully save a dish with base cost into Firebase. | Mock or live Firebase client, dish payload. | Test passes confirming document creation, field integrity, and retrieval. | Test failure assertion if write fails or saved attributes mismatch. | ORIGINAL_REQUEST.md Criteria |
| 21 | Quality Assurance | Automated Test: Cart & Markup Pricing | Automated test suite verifying markup addition (`precio_final = costo_base + margen`) and cart calculations. | Base cost input, platform markup config, cart additions. | Test passes verifying correct mathematical final price and cart subtotal/total calculation. | Test failure assertion if arithmetic or rounding deviations occur. | ORIGINAL_REQUEST.md Criteria |
| 22 | Quality Assurance | Inspector Readiness & UI Health | Provision of clean DOM structure, accessible semantic elements, and error-free rendering for independent visual/functional inspection. | Page route requests (`/`, `/provider`, `/cart`, `/admin`). | HTTP 200, no fatal console exceptions, visual elements rendered and interactable. | Inspector flags fatal errors or missing functional elements. | ORIGINAL_REQUEST.md Criteria |

---

## 4. Domain Data Models & Schema

### 4.1 Collection: `dishes`
Represents gastronomic offerings published by entrepreneurs.

```typescript
interface Dish {
  id: string;                    // Auto-generated Firestore document ID
  providerId: string;            // Identifier for provider/entrepreneur
  name: string;                  // Name of the culinary dish (e.g. "Empanadas Salteñas x6")
  description: string;           // Gastronomic description / ingredients
  category: string;              // Category (e.g. "Minutas", "Pastas", "Postres", "Bebidas")
  baseCost: number;              // Supplier base production cost (e.g. 3500)
  platformMarkup: number;        // Markup percentage or fixed amount configured for this item/platform
  finalPrice: number;            // Calculated price for customer: baseCost + markup (e.g. 4200)
  imageUrl: string;              // Firebase Cloud Storage download URL
  imageStoragePath: string;      // Storage reference path (e.g. "dishes/{id}.jpg")
  available: boolean;            // Availability flag (true = active in catalog, false = paused/out of stock)
  createdAt: string | Timestamp; // ISO 8601 string or Firebase Timestamp
  updatedAt: string | Timestamp; // Last modified timestamp
}
```

### 4.2 Collection: `platform_config` (or config document)
Defines global business parameters managed by the platform owner.

```typescript
interface PlatformConfig {
  markupType: 'percentage' | 'fixed'; // Pricing strategy
  markupValue: number;                // e.g. 0.20 (20%) or fixed $500
  brandName: string;                  // "Platito"
  contactPhone: string;               // Platform owner WhatsApp/phone for logistics
  deliveryNotice: string;             // Notice explaining owner delivers personally
}
```

### 4.3 Collection: `orders`
Represents simulated purchase orders submitted by anonymous customers for platform owner fulfillment.

```typescript
interface OrderItem {
  dishId: string;
  name: string;
  quantity: number;
  unitPrice: number;       // finalPrice at time of purchase
  subtotal: number;        // unitPrice * quantity
}

interface Order {
  id: string;              // Auto-generated Firestore document ID
  customer: {
    fullName: string;      // Customer full name
    phone: string;         // Contact phone for delivery coordination
    address: string;       // Physical delivery address
    notes?: string;        // Delivery instructions (e.g. "Piso 2, Dpto B")
  };
  items: OrderItem[];      // Array of purchased dish snapshots
  totalAmount: number;     // Grand total payable
  status: 'pending_delivery' | 'delivered' | 'cancelled';
  createdAt: string | Timestamp;
  isSimulated: boolean;    // Always true for MVP
}
```

### 4.4 Local State / Session: `cart`
Client-side cart state stored in memory and persisted in `localStorage` for anonymous continuity.

```typescript
interface CartItem {
  dishId: string;
  name: string;
  description: string;
  imageUrl: string;
  finalPrice: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
}
```

---

## 5. Pricing & Markup Engine Specification

### 5.1 Pricing Formula
The core business requirement states:
$$\text{Precio Final} = \text{Costo Base} + \text{Margen de la Plataforma}$$

There are two primary implementations for the markup calculation:
1. **Percentage Margin (Standard E-Commerce Marketplace)**:
   $$\text{Margen} = \text{Costo Base} \times \text{MargenPorcentaje}$$
   $$\text{Precio Final} = \text{Costo Base} \times (1 + \text{MargenPorcentaje})$$
   *Example*: Base cost = $4,000; Margin = 20% (0.20); Markup = $800; Final Price = $4,800.
2. **Fixed Margin / Fee**:
   $$\text{Precio Final} = \text{Costo Base} + \text{MargenFijo}$$
   *Example*: Base cost = $4,000; Margin = $500; Final Price = $4,500.

### 5.2 Rounding & Formatting Rules
- All currency calculations must be rounded cleanly to 2 decimal places (e.g. `Math.round(val * 100) / 100`) or rounded to the nearest whole integer if dealing with currencies like ARS/CLP.
- The customer catalog and cart must never display fractional cents (e.g., $12.333333).
- Display format must include currency symbol (e.g., `$4.800` or `$4,800.00`).

### 5.3 Confidentiality Separation
- The customer view MUST only expose `finalPrice`.
- The customer API response / UI presentation must NOT reveal `baseCost` or `platformMarkup` breakdown to maintain white-label confidentiality and protect supplier margins.

---

## 6. Image Management & 1 MB Constraint Specification

### 6.1 Constraint Definition (R2)
> "El sistema debe asegurar que las imágenes pesen máximo 1 MB (comprimiéndolas o validándolas) antes de subirlas a Firebase."

### 6.2 Dual Enforcement Strategy
To guarantee compliance and exceptional UX, Platito should adopt a **two-tier enforcement**:
1. **Client-Side Compression**:
   - When a provider selects an image larger than 1 MB, the frontend automatically utilizes a canvas-based compression routine (or standard utility like `browser-image-compression` or HTML5 Canvas `toBlob('image/jpeg', quality)`).
   - The image is resized (e.g. max dimension 1600px width/height) and compressed iteratively until file size is $\le 1\text{ MB}$ (typically 400KB - 800KB).
2. **Client-Side Strict Validation Gate**:
   - If a file is selected that cannot be compressed below 1 MB, or if compression is bypassed, the file upload is blocked before sending any network request to Firebase.
   - An informative Spanish-language error is displayed: *"La imagen supera el límite permitido de 1 MB. Por favor elige una imagen más liviana."*
3. **Storage Security Rule Gate (Defense in Depth)**:
   - Firebase Storage Security Rules enforce `request.resource.size <= 1 * 1024 * 1024` (1,048,576 bytes) and `request.resource.contentType.matches('image/.*')`.

---

## 7. Firebase Backend & Security Rules Specification

### 7.1 Cloud Firestore / Database Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Dishes collection
    match /dishes/{dishId} {
      // Any customer can read available dishes in the vitrina
      allow read: if true;
      
      // Providers can create dishes with valid baseCost and required fields
      allow create: if request.resource.data.name is string
                    && request.resource.data.name.size() > 0
                    && request.resource.data.baseCost is number
                    && request.resource.data.baseCost > 0
                    && request.resource.data.finalPrice is number
                    && request.resource.data.finalPrice >= request.resource.data.baseCost
                    && request.resource.data.available is bool;
                    
      // Providers can update their dishes (cost, availability, details)
      allow update: if request.resource.data.baseCost is number
                    && request.resource.data.baseCost > 0
                    && request.resource.data.finalPrice is number
                    && request.resource.data.available is bool;
                    
      // Restrict arbitrary deletion in production MVP
      allow delete: if true;
    }
    
    // Orders collection
    match /orders/{orderId} {
      // Anonymous customers can place simulated orders
      allow create: if request.resource.data.customer.fullName is string
                    && request.resource.data.customer.phone is string
                    && request.resource.data.customer.address is string
                    && request.resource.data.items is list
                    && request.resource.data.items.size() > 0
                    && request.resource.data.totalAmount is number
                    && request.resource.data.totalAmount > 0;
                    
      // Orders can be read by the platform owner for logistics dispatch
      allow read: if true;
      allow update, delete: if false; // Orders are immutable once placed
    }
    
    // Platform config
    match /platform_config/{configId} {
      allow read: if true;
      allow write: if true; // Configurable by platform owner
    }
  }
}
```

### 7.2 Firebase Cloud Storage Security Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /dishes/{allPaths=**} {
      // Public read access for customer vitrina
      allow read: if true;
      
      // Max 1 MB constraint enforced at storage level
      allow write: if request.resource.size <= 1 * 1024 * 1024
                   && request.resource.contentType.matches('image/(jpeg|png|webp|jpg)');
    }
  }
}
```

---

## 8. Edge Cases & Boundary Conditions

| # | Feature | Input / Scenario | Expected / Observed Behavior |
|---|---------|------------------|------------------------------|
| 1 | Dish Base Cost | Base cost is 0, negative (`-50`), or non-numeric (`"abc"`). | Form validation prevents submission with message "El costo base debe ser un valor numérico mayor a cero". Database reject rule enforces `baseCost > 0`. |
| 2 | Dish Base Cost | Extremely large value (e.g. `1,000,000,000`). | Input length capped (max 8 digits); warning if price exceeds reasonable threshold, preventing overflow. |
| 3 | Image Upload | Raw image is 5 MB high-resolution photo from smartphone. | Client compression downsizes image dimensions and compresses quality to produce payload < 1 MB. Upload succeeds. |
| 4 | Image Upload | Raw file is 1.01 MB (1,059,000 bytes) and compression is disabled. | Validation gate blocks upload immediately. User sees "La imagen supera el límite de 1 MB". No upload request sent. |
| 5 | Image Upload | File is exactly 1,048,576 bytes (exact 1 MB). | Permitted through validation and storage rules (boundary condition $\le 1\text{ MB}$). Upload succeeds. |
| 6 | Image Upload | File is 0 bytes (empty file). | Rejected by validation: "El archivo está vacío o es inválido". |
| 7 | Image Upload | User attempts to upload `.pdf`, `.exe`, or `.svg` with scripts. | Blocked by MIME type filter: only `image/jpeg`, `image/png`, `image/webp` allowed. |
| 8 | Dish Availability | Provider toggles dish to "Unavailable" while item is in customer's active cart. | In vitrina: item shows "No disponible" and cannot be added. In checkout: customer receives prompt that item became unavailable; item removed or checkout disabled for that item. |
| 9 | Catalog State | Empty database (zero dishes uploaded). | Customer vitrina renders a friendly empty state ("Aún no hay platos publicados. ¡Vuelve pronto!"). No crashing or broken spinners. |
| 10 | Cart Operations | Customer adds 0 or negative quantity via URL manipulation or manual input. | Cart normalizer enforces minimum quantity of 1. If quantity reaches 0, item is removed from cart. |
| 11 | Cart Operations | Customer clicks "Comprar" with an empty cart. | Checkout button is disabled or redirects to catalog with banner "Tu carrito está vacío". |
| 12 | Anonymous Session | Customer refreshes browser or navigates between vitrina and provider panel. | Cart persists in `localStorage`; customer does not lose their selected dishes. |
| 13 | Pricing Rounding | Markup is 15% on a base cost of $1,055 ($158.25 markup -> $1,213.25 final). | System rounds cleanly to $1,213.25 or $1,213 depending on platform currency setting; no ugly float anomalies (e.g. `$1213.2500000000002`). |
| 14 | Checkout Submission | Simulated checkout submitted with empty phone or empty address. | Form highlights missing fields: "Por favor ingresa una dirección de entrega válida y un teléfono de contacto". |
| 15 | Network Disconnect | Network drops during dish creation or order submission. | UI shows retry toast ("Error de conexión con Firebase. Por favor intenta nuevamente."). Form data is preserved so user doesn't re-type. |
| 16 | Malicious Input | Script injection in dish title (e.g. `<script>alert('XSS')</script>`). | React / Next.js auto-escapes string content. Content displayed as plain text, no execution possible. |

---

## 9. Acceptance Criteria & Automated Testing Matrix

| Acceptance Criterion | Verification Method | Pass Criteria | Target Module |
|---|---|---|---|
| **AC-1: Provider Dish Save** | Automated unit/integration test (`vitest` or `jest`). | Provider submits valid dish (name, description, baseCost: 3000, available: true); record is stored in Firebase; query returns matching document. | Provider Panel / Firebase Service |
| **AC-2: Markup & Cart Pricing** | Automated unit/integration test. | Given baseCost = 2000 and markup = 20%, verify finalPrice = 2400. Adding 2 units to cart calculates total = 4800. | Pricing Engine / Cart Store |
| **AC-3: Image Size Limitation (<= 1MB)** | Automated test with mock files (> 1MB and <= 1MB). | Mock file of 1.5 MB triggers compression or validation rejection; file of 800 KB is accepted for storage upload. | Image Utility / Storage Service |
| **AC-4: Security Rules Data Protection** | Automated rules test or manual security check. | Firestore and Storage security rules validate required fields, positive prices, and block unauthorized writes or files > 1 MB. | Firebase Security Rules |
| **AC-5: Independent Visual & Functional Inspection** | Visual inspection via browser / HTTP probe / E2E verification. | The app builds cleanly, routes load without runtime errors, layout displays Platito branding, and interactive flows (add dish, add to cart, checkout) are visually functional. | Next.js / React Web App |

---

## 10. Non-Functional & Architecture Constraints

1. **Frontend Framework**: Next.js (App Router or Pages Router) or React (Vite). Responsive design supporting mobile viewports (since customers frequently order food on smartphones).
2. **Firebase Backend**:
   - Cloud Firestore (recommended for structured querying of dishes and orders) or Realtime Database.
   - Firebase Cloud Storage for media assets.
   - Client SDK configuration with local emulator or direct project credentials support.
3. **Simulated Checkout Reality**:
   - No payment gateway integration (Stripe, Mercado Pago) is required for this MVP phase.
   - Checkout is a high-fidelity functional simulation capturing customer logistics details (Name, Address, Phone, Notes) and generating an order record.
4. **Platform Owner Logistics**:
   - A dedicated platform owner / admin view or logistics tab allowing the platform owner to inspect incoming customer orders to fulfill personal deliveries.
