# Handoff Report: Scaffolding & Setup Specification for Milestone 1

**Agent**: `m1_exp_scaffold`  
**Role**: Scaffolding & Setup Explorer  
**Working Directory**: `d:\platito\.agents\m1_exp_scaffold\`  
**Target Milestone**: M1 — Core Foundation & Shared Services  
**Recipient**: Orchestrator (`6ec01994-ba78-497c-9438-bc44de7ce98f`) / Worker (`m1_worker`)  
**Timestamp**: 2026-09-17T21:07:00-03:00  

---

## 1. Observation

1. **Host Environment**:
   - Running `node -v` in `d:\platito` returned `v22.20.0`.
   - Running `npm -v` in `d:\platito` returned `11.11.0`.
   - Running `git status` returned `fatal: not a git repository (or any of the parent directories): .git`.
   - Running `npm view next version` returned `16.3.5`, confirming direct active registry network access.
2. **Initial Filesystem State (`d:\platito`)**:
   - Direct listing of `d:\platito` revealed 1 directory (`.agents`) and 2 files: `ORIGINAL_REQUEST.md` (1,949 bytes) and `PROJECT.md` (12,397 bytes). No `package.json`, `tsconfig.json`, or source directories currently exist.
3. **Project Specifications**:
   - `PROJECT.md` § Architecture (lines 8–11) explicitly specifies:
     > "1. Frontend Presentation (Next.js 14 App Router / React / TypeScript / Tailwind CSS):
     > - (storefront) route group: Customer-facing anonymous showcase (/), dish details, cart drawer, and simulated checkout (/checkout).
     > - provider route: Entrepreneur management portal (/provider) for dish creation, base cost definition, image upload with strict <= 1 MB compression, and availability toggles.
     > - admin route: Platform owner logistics dashboard (/admin/orders) for reviewing incoming simulated orders for manual delivery."
   - `PROJECT.md` § Milestones (line 64) specifies:
     > "M1 | Core Foundation & Shared Services | Project scaffold (Next.js, TS, Tailwind), types, Pricing Engine, Image Compressor (<=1MB), Resilient DB/Storage Adapters, Security Rules, Vitest setup & unit tests | none | PLANNED"
   - `PROJECT.md` § Code Layout (lines 173–235) details the exact directory structure: `app/`, `components/`, `lib/`, `types/`, `tests/`, `firestore.rules`, `storage.rules`, `package.json`, `tsconfig.json`, `tailwind.config.ts`, `vitest.config.ts`.
4. **Peer Explorer Coordination**:
   - `m1_exp_services/DISPATCH.md` confirmed requirements for domain types (`types/dish.ts`, `types/cart.ts`, `types/order.ts`, `types/platform.ts`), Firebase adapters (`lib/firebase/config.ts`, `lib/services/dishService.ts`, `lib/services/storageService.ts`, `lib/services/orderService.ts`), and security rules (`firestore.rules`, `storage.rules`).
   - `m1_exp_tests/DISPATCH.md` confirmed unit test requirements (`tests/unit/pricing.test.ts`, `tests/unit/imageCompression.test.ts`, `tests/unit/dishService.test.ts`) executed via Vitest.

---

## 2. Logic Chain

1. **Premise 1 (Scaffolding Method)**: `create-next-app` fails when target directory `d:\platito` is not empty (contains `.agents`, `PROJECT.md`, `ORIGINAL_REQUEST.md`) and requires interactive terminal interaction.
   - *Inference*: Scaffolding must be accomplished deterministically by directly writing `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, and `vitest.config.ts`, followed by running non-interactive `npm install`.
2. **Premise 2 (Runtime & Dependency Stability)**: Next.js 14.2.15 with React 18.3.1 offers stable compatibility with `@testing-library/react` 16.x and `browser-image-compression` on Node 22 without experimental React 19 canary issues.
   - *Inference*: Pin dependencies in `package.json` to Next.js `^14.2.15`, React `^18.3.1`, Tailwind `^3.4.14`, Vitest `^2.1.3`, Firebase `^11.0.1`.
3. **Premise 3 (Test Harness Reliability)**: Vitest requires `@vitejs/plugin-react` to parse TSX, `jsdom` for browser DOM simulation, and `@testing-library/jest-dom` for DOM assertions. Vitest exits with error code 1 if no test files match unless `passWithNoTests: true` is configured or a smoke test is present.
   - *Inference*: Configure `vitest.config.ts` with `@vitejs/plugin-react`, JSDOM environment, setup file `tests/setup.ts` (with `URL.createObjectURL` polyfills), path alias `@/*` -> `./*`, and add baseline `tests/unit/smoke.test.ts`.
4. **Premise 4 (Layout Compliance)**: PROJECT.md specifies route groups `app/(storefront)` and `app/provider`, and requires root `app/layout.tsx` with `<html>` and `<body>` tags.
   - *Inference*: Establish directory hierarchy and baseline files (`app/layout.tsx`, `app/(storefront)/layout.tsx`, `app/(storefront)/page.tsx`, `app/provider/page.tsx`, `app/globals.css`) so `npm run build` passes immediately upon scaffold completion.

---

## 3. Caveats

1. **React 18 vs React 19**: Next.js 15 defaults to React 19, but ecosystem libraries like `@testing-library/react` and some third-party canvas utilities have peer dependency warnings with React 19. React 18.3.1 + Next.js 14.2.15 is specified to ensure zero dependency friction.
2. **Offline vs Live Firebase**: The project requires dual operational capability. Scaffolding sets `.env.local` with `NEXT_PUBLIC_USE_MOCK=true` by default so that all tests and preview servers run without requiring live Firebase credentials. Live credentials can be supplied transparently at any time.
3. **Git Initialization**: The repository is currently not initialized with git. Version control initialization (`git init`) is left to the orchestrator or worker per project guidelines.

---

## 4. Conclusion

A complete, self-contained scaffolding specification and execution plan has been formulated and documented in `d:\platito\.agents\m1_exp_scaffold\analysis.md`. The implementing worker (`m1_worker`) has exact contents for:
1. `package.json` with all necessary dependencies and standard scripts (`dev`, `build`, `start`, `lint`, `test`, `test:watch`, `test:coverage`, `test:e2e`).
2. Exact configuration files: `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.eslintrc.json`, `.gitignore`, `.env.example`, `.env.local`, `firestore.rules`, `storage.rules`.
3. Directory tree creation matching `PROJECT.md § Code Layout`.
4. Baseline foundational files (`lib/utils/cn.ts`, `app/globals.css`, `app/layout.tsx`, `app/(storefront)/page.tsx`, `app/provider/page.tsx`, `tests/setup.ts`, `tests/unit/smoke.test.ts`).

---

## 5. Verification Method

To independently verify the scaffolding plan after worker execution, execute the following commands in sequence in `d:\platito`:

1. **Install Dependencies**:
   ```powershell
   npm install
   ```
   *Expected*: Completes cleanly with exit code 0; `node_modules` directory populated.
2. **Execute Unit Test Harness**:
   ```powershell
   npm run test
   ```
   *Expected*: Vitest executes and passes `tests/unit/smoke.test.ts` with 0 failures (exit code 0).
3. **Execute Production Build**:
   ```powershell
   npm run build
   ```
   *Expected*: Next.js App Router compiles `app/layout.tsx`, `app/(storefront)/page.tsx`, and static assets into `.next/` with 0 TypeScript and ESLint errors.
4. **Execute Linter**:
   ```powershell
   npm run lint
   ```
   *Expected*: ESLint completes with 0 warnings/errors.
5. **Inspect Filesystem Compliance**:
   Verify existence of all directories matching `PROJECT.md § Code Layout` (`app/(storefront)`, `app/provider`, `app/admin/orders`, `components/`, `lib/services/`, `lib/utils/`, `types/`, `tests/unit/`).

*Invalidation Conditions*:
- If `npm run test` fails with `Cannot find module` or JSDOM errors.
- If `npm run build` fails due to missing root `<html>`/`<body>` tags in `app/layout.tsx` or TypeScript path alias failures (`@/*`).
