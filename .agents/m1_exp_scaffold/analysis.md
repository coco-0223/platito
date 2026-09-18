# Milestone 1: Scaffolding & Setup Technical Specification

**Explorer Agent**: `m1_exp_scaffold`  
**Role**: Scaffolding & Setup Explorer  
**Working Directory**: `d:\platito\.agents\m1_exp_scaffold\`  
**Target Milestone**: M1 — Core Foundation & Shared Services  
**Date / Timestamp**: 2026-09-17T21:05:00-03:00  

---

## 1. Executive Summary & Strategy

This document specifies the concrete scaffolding plan for Milestone 1 of the **Platito MVP** project. It provides the exact file manifests, configuration specifications, directory hierarchy, and execution instructions for the implementing worker agent (`m1_worker`).

### 1.1. Why Direct Manifest Generation over `create-next-app`?
1. **Target Directory Non-Empty Constraint**: The workspace `d:\platito` already contains `.agents/`, `PROJECT.md`, and `ORIGINAL_REQUEST.md`. Running `npx create-next-app` aborts or prompts interactively when files are present.
2. **Deterministic Architecture**: `create-next-app` often generates opinionated structures (e.g. `src/` directory, default boilerplates) that deviate from the contract established in `PROJECT.md § Code Layout`.
3. **Reproducibility**: Direct generation of `package.json`, configuration files, and running non-interactive `npm install` eliminates ambiguity, interactive prompts, and dependency version drift.

### 1.2. Technology Version Matrix
- **Node.js Runtime**: `v22.20.0` (Host confirmed)
- **Package Manager**: `npm 11.11.0` (Host confirmed)
- **Framework**: `Next.js ^14.2.15` (App Router)
- **UI Runtime**: `React ^18.3.1`, `react-dom ^18.3.1`
- **Styling**: `Tailwind CSS ^3.4.14`, `PostCSS ^8.4.47`, `Autoprefixer ^10.4.20`
- **Iconography & Utilities**: `lucide-react ^0.453.0`, `clsx ^2.1.1`, `tailwind-merge ^2.5.4`
- **Testing**: `Vitest ^2.1.3`, `@vitejs/plugin-react ^4.3.3`, `@testing-library/react ^16.0.1`, `@testing-library/jest-dom ^6.6.2`, `jsdom ^25.0.1`
- **Cloud SDK**: `firebase ^11.0.1`
- **Media Compression**: `browser-image-compression ^2.0.2`

---

## 2. Exact Package Manifest (`package.json`)

The file `d:\platito\package.json` must be written with the following exact content:

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
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "browser-image-compression": "^2.0.2",
    "clsx": "^2.1.1",
    "firebase": "^11.0.1",
    "lucide-react": "^0.453.0",
    "next": "^14.2.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.5.4"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.1",
    "@testing-library/jest-dom": "^6.6.2",
    "@testing-library/react": "^16.0.1",
    "@types/node": "^20.17.0",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "eslint": "^8.57.1",
    "eslint-config-next": "^14.2.15",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
    "vitest": "^2.1.3"
  }
}
```

### 2.1. Dependency Breakdown & Purpose
| Package | Version | Type | Purpose |
|---|---|---|---|
| `next` | `^14.2.15` | Production | React framework with App Router, server/client routing, dynamic image optimization. |
| `react` / `react-dom` | `^18.3.1` | Production | Core UI rendering engine; 18.3.1 ensures stable compatibility with Vitest & RTL. |
| `firebase` | `^11.0.1` | Production | Modular Web SDK for Cloud Firestore & Cloud Storage. |
| `browser-image-compression` | `^2.0.2` | Production | Client-side compression pipeline targeting $\le 1\text{ MB}$. |
| `lucide-react` | `^0.453.0` | Production | Clean icon set for culinary categories, cart, upload indicators, and badges. |
| `clsx` & `tailwind-merge` | `^2.1.1` / `^2.5.4` | Production | Utility functions (`cn()`) for robust Tailwind CSS class merging. |
| `vitest` | `^2.1.3` | Development | Ultra-fast unit & integration test runner, Vite-native with JSDOM support. |
| `@vitejs/plugin-react` | `^4.3.3` | Development | Enables JSX/TSX parsing in Vitest test runs. |
| `@testing-library/react` | `^16.0.1` | Development | React component rendering and DOM testing utilities. |
| `@testing-library/jest-dom` | `^6.6.2` | Development | Custom matchers for DOM assertions (`toBeInTheDocument`, etc.). |
| `jsdom` | `^25.0.1` | Development | In-memory DOM implementation for Node-based Vitest execution. |
| `tailwindcss` | `^3.4.14` | Development | Utility-first CSS framework. |
| `typescript` | `^5.6.3` | Development | Static typing, interface enforcement, and contract compliance. |
| `eslint` / `eslint-config-next` | `^8.57.1` / `^14.2.15` | Development | Next.js standard linting rules. |

---

## 3. Configuration Files Specifications

### 3.1. `tsconfig.json`
Location: `d:\platito\tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

### 3.2. `next.config.mjs`
Location: `d:\platito\next.config.mjs`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
```

### 3.3. `tailwind.config.ts`
Location: `d:\platito\tailwind.config.ts`
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        platito: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316", // Core brand warm culinary orange
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

### 3.4. `postcss.config.mjs`
Location: `d:\platito\postcss.config.mjs`
```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
```

### 3.5. `vitest.config.ts`
Location: `d:\platito\vitest.config.ts`
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

### 3.6. `tests/setup.ts`
Location: `d:\platito\tests\setup.ts`
Ensures JSDOM has mock browser APIs for Vitest (e.g. `URL.createObjectURL`, `URL.revokeObjectURL`):
```typescript
import "@testing-library/jest-dom";

// Polyfills for browser APIs inside JSDOM environment
if (typeof window !== "undefined") {
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = (blob: Blob | MediaSource) => "blob:mock-object-url";
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = () => {};
  }
}
```

### 3.7. `.eslintrc.json`
Location: `d:\platito\.eslintrc.json`
```json
{
  "extends": "next/core-web-vitals"
}
```

### 3.8. `.gitignore`
Location: `d:\platito\.gitignore`
```
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
```

### 3.9. `.env.example` & `.env.local`
Location: `d:\platito\.env.example`
```env
# Platito Environment Variables

# Set to true to force In-Memory Mock Adapter (zero-config local dev & tests)
NEXT_PUBLIC_USE_MOCK=true

# Platform Markup Percentage (Default 20%)
NEXT_PUBLIC_PLATFORM_MARKUP_PERCENTAGE=20
NEXT_PUBLIC_PLATFORM_NAME=Platito

# Firebase Configuration (Live Mode)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Location: `d:\platito\.env.local`
```env
# Default to mock mode for instant standalone preview without live credentials
NEXT_PUBLIC_USE_MOCK=true
NEXT_PUBLIC_PLATFORM_MARKUP_PERCENTAGE=20
NEXT_PUBLIC_PLATFORM_NAME=Platito
```

### 3.10. `firestore.rules` & `storage.rules`
Location: `d:\platito\firestore.rules`
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /dishes/{dishId} {
      allow read: if true;
      allow create, update: if request.resource.data.name is string
                            && request.resource.data.name.size() > 0
                            && request.resource.data.baseCost is number
                            && request.resource.data.baseCost >= 0
                            && request.resource.data.available is bool
                            && request.resource.data.imageSize <= 1048576;
      allow delete: if true;
    }
    match /orders/{orderId} {
      allow create: if request.resource.data.items is list
                    && request.resource.data.items.size() > 0
                    && request.resource.data.totalAmount is number
                    && request.resource.data.totalAmount > 0
                    && request.resource.data.customer.name is string
                    && request.resource.data.customer.address is string;
      allow read, update: if true;
    }
    match /platform_settings/{settingId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

Location: `d:\platito\storage.rules`
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /dishes/{dishId}/{filename} {
      allow read: if true;
      allow write: if request.resource.size <= 1048576
                   && request.resource.contentType.matches('image/(jpeg|png|webp|jpg)');
    }
  }
}
```

---

## 4. Directory Structure Creation Plan

The Worker must create the directory structure matching `PROJECT.md § Code Layout`:

```
d:/platito/
├── app/
│   ├── (storefront)/
│   │   ├── page.tsx               # Root Vitrina page
│   │   ├── layout.tsx             # Customer layout
│   │   └── checkout/
│   │       └── page.tsx           # Checkout simulation
│   ├── provider/
│   │   ├── page.tsx               # Provider portal
│   │   └── layout.tsx             # Provider layout
│   ├── admin/
│   │   └── orders/
│   │       └── page.tsx           # Logistics orders dashboard
│   ├── api/                       # Next.js route handlers
│   ├── globals.css                # Tailwind entry CSS
│   └── layout.tsx                 # Root HTML layout
├── components/
│   ├── storefront/                # Customer components (DishCard, CartDrawer, etc.)
│   ├── provider/                  # Provider components (DishUploadForm, ImageDropzone)
│   └── ui/                        # Shared UI primitives (buttons, badges, inputs)
├── lib/
│   ├── firebase/
│   │   └── config.ts              # Firebase initialization
│   ├── services/
│   │   ├── dishService.ts         # Unified dish service (Firestore + In-Memory)
│   │   ├── storageService.ts      # Cloud Storage + local dataURL storage
│   │   └── orderService.ts        # Orders management service
│   ├── utils/
│   │   ├── pricing.ts             # Pricing engine pure functions
│   │   ├── imageCompression.ts    # Compression & validation (<= 1MB)
│   │   └── cn.ts                  # Classname merging utility
│   └── context/
│       └── CartContext.tsx        # React cart context
├── types/
│   ├── dish.ts                    # Dish interfaces
│   ├── cart.ts                    # Cart interfaces
│   ├── order.ts                   # Order interfaces
│   └── platform.ts                # Platform settings interfaces
├── tests/
│   ├── setup.ts                   # Vitest setup & polyfills
│   ├── unit/
│   │   ├── smoke.test.ts          # Baseline harness test
│   │   ├── pricing.test.ts        # Pricing markup arithmetic tests
│   │   ├── imageCompression.test.ts # <= 1MB compression & rejection tests
│   │   ├── cart.test.ts           # Cart state tests
│   │   └── dishService.test.ts    # Automated DB dish save tests
│   └── e2e/
│       ├── storefront.spec.ts
│       ├── provider.spec.ts
│       └── checkout.spec.ts
├── firestore.rules
├── storage.rules
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── next.config.mjs
├── vitest.config.ts
├── .eslintrc.json
├── .gitignore
├── .env.example
└── .env.local
```

---

## 5. Baseline Core Files for Build & Test Readiness

To ensure `npm run test`, `npm run build`, and `npm run lint` succeed immediately upon scaffolding completion, the Worker must instantiate the following baseline files:

### 5.1. `lib/utils/cn.ts`
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 5.2. `app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --primary: #f97316;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f8fafc;
  color: #0f172a;
}
```

### 5.3. `app/layout.tsx` (Root Layout)
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Platito - Marketplace Gastronómico",
  description: "Marketplace gastronómico de marca blanca",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
```

### 5.4. `app/(storefront)/layout.tsx`
```tsx
export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="storefront-wrapper min-h-screen flex flex-col">{children}</div>;
}
```

### 5.5. `app/(storefront)/page.tsx`
```tsx
export default function VitrinaPage() {
  return (
    <main className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-extrabold text-orange-600">Platito</h1>
      <p className="mt-2 text-slate-600">Marketplace gastronómico de marca blanca.</p>
    </main>
  );
}
```

### 5.6. `app/provider/page.tsx`
```tsx
export default function ProviderPage() {
  return (
    <main className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800">Panel del Proveedor</h1>
      <p className="mt-2 text-slate-600">Gestión de catálogo, costos base y disponibilidad.</p>
    </main>
  );
}
```

### 5.7. `tests/unit/smoke.test.ts`
```typescript
import { describe, it, expect } from "vitest";

describe("Vitest Scaffolding Harness Smoke Test", () => {
  it("should evaluate basic assertions successfully", () => {
    expect(1 + 1).toBe(2);
  });

  it("should have DOM environment active via JSDOM", () => {
    expect(typeof window).toBe("object");
    expect(typeof document).toBe("object");
  });
});
```

---

## 6. Step-by-Step Execution Sequence for Worker Agent

The implementing Worker agent (`m1_worker`) must follow this exact sequential checklist:

1. **Write Manifest and Configs**:
   - Write `package.json`
   - Write `tsconfig.json`
   - Write `tailwind.config.ts`
   - Write `postcss.config.mjs`
   - Write `next.config.mjs`
   - Write `vitest.config.ts`
   - Write `.eslintrc.json`
   - Write `.gitignore`
   - Write `.env.example` and `.env.local`
   - Write `firestore.rules` and `storage.rules`

2. **Execute Package Installation**:
   - Run `npm install` in `d:\platito`
   - Validate exit code 0 and absence of critical peer-dependency conflicts.

3. **Establish Directory Hierarchy**:
   - Create directories:
     - `app/(storefront)/checkout`
     - `app/provider`
     - `app/admin/orders`
     - `app/api`
     - `components/storefront`
     - `components/provider`
     - `components/ui`
     - `lib/firebase`
     - `lib/services`
     - `lib/utils`
     - `lib/context`
     - `types`
     - `tests/unit`
     - `tests/e2e`

4. **Populate Baseline Files**:
   - Write `lib/utils/cn.ts`
   - Write `app/globals.css`
   - Write `app/layout.tsx`
   - Write `app/(storefront)/layout.tsx`
   - Write `app/(storefront)/page.tsx`
   - Write `app/provider/page.tsx`
   - Write `tests/setup.ts`
   - Write `tests/unit/smoke.test.ts`

5. **Verification & Quality Gates**:
   - Run `npm run test` -> Must pass all unit smoke tests.
   - Run `npm run build` -> Next.js App Router must compile with 0 TypeScript/ESLint errors.
   - Run `npm run lint` -> Must pass cleanly.

---

## 7. Quality Assurance & Self-Verification Matrix

| Gate | Command | Expected Result | Mitigation if Failed |
|---|---|---|---|
| **Dependency Install** | `npm install` | Clean install, `node_modules` populated | Check node/npm compatibility; use exact versions. |
| **Unit Test Suite** | `npm run test` | Vitest executes `smoke.test.ts` and passes (100% exit code 0) | Verify `vitest.config.ts`, `tests/setup.ts` and JSDOM environment. |
| **Next.js Production Build** | `npm run build` | Route tree compiled into `.next`, static routes generated | Check `app/layout.tsx` has `<html>` and `<body>`; verify path aliases in `tsconfig.json`. |
| **Code Linting** | `npm run lint` | Next.js ESLint passes with 0 errors | Verify `.eslintrc.json` contains `"extends": "next/core-web-vitals"`. |

---
*Report formulated and approved by `m1_exp_scaffold` for Milestone 1 Worker handoff.*
