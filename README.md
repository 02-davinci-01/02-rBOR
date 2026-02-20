# 02-rBOR CLI

[![npm version](https://img.shields.io/npm/v/02-rbor.svg)](https://www.npmjs.com/package/02-rbor)
[![CI](https://github.com/02-davinci-01/02-rbor/workflows/CI/badge.svg)](https://github.com/02-davinci-01/02-rbor/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> **recusrive Branching Orchestration Rendering**

A CLI tool for building frontend applications following the **02-rBOR** architecture pattern. Generate domain-driven feature modules with proper layering, enforce architectural rules, and analyze dependency graphs — with SVG visualization out of the box.

## 🤔 What is rBOR?

rBOR is an opinionated folder architecture for React apps. Instead of organizing by file type (`components/`, `hooks/`, `services/` at the root), rBOR organizes by **domain** — each feature gets its own self-contained folder with every layer it needs.

The idea: a `user` feature shouldn't scatter its files across 6 different top-level folders. Everything related to `user` lives under `domains/user/`, with a single barrel export (`index.tsx`) as the public API.

Each domain follows a strict **downward dependency rule** inspired by the [Dependency Inversion Principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle):

```
  ┌─────────────────────────────┐
  │  Page (route)               │  composes components
  └──────────────┬──────────────┘
                 ▼
  ┌─────────────────────────────┐
  │  Component (UI)             │  renders data from hooks
  └──────────────┬──────────────┘
                 ▼
  ┌─────────────────────────────┐
  │  Hook — data / action       │  React Query fetching & mutations
  └──────────────┬──────────────┘
                 ▼
  ┌─────────────────────────────┐
  │  Hook — controller          │  creates service, wires methods
  └──────────────┬──────────────┘
                 ▼
  ┌─────────────────────────────┐
  │  Method (pure logic)        │  receives service as 1st param
  └──────────────┬──────────────┘
                 ▼
  ┌─────────────────────────────┐
  │  Service (HTTP layer)       │  extends BaseService
  └──────────────┬──────────────┘
                 ▼
  ┌─────────────────────────────┐
  │  Infrastructure (shared)    │  BaseService, ServiceFactory
  └─────────────────────────────┘
```

**Control flows upward** — each layer orchestrates the layer below it.  
**Dependencies flow downward** — lower layers are completely independent of what consumes them.

This means:

- `Infrastructure` (BaseService, ServiceFactory) knows nothing about any domain.
- `Service` extends BaseService — depends only on infrastructure.
- `Method` receives a service object as its first argument — depends only on services.
- `Hook (controller)` creates the service via ServiceFactory, passes it to methods — depends on methods & infrastructure.
- `Hook (data/action)` consumes the controller hook for fetching or mutations — depends on the controller.
- `Component` renders data from hooks — depends only on hooks.
- `Page` composes components — depends only on components.

Lower layers never import from higher layers. This keeps your business logic testable, your services reusable, and your UI replaceable.

## 📦 Installation

```bash
npm install -g 02-rbor
```

```bash
rbor init
rbor domain <domain-name>
```

> **Tip:** If you prefer not to install globally, use `npx` — it works without any install:
>
> ```bash
> npx 02-rbor init
> npx 02-rbor domain <domain-name>
> ```
>
> All commands work with `npx 02-rbor <command>`, for example:
>
> ```bash
> npx 02-rbor domain user
> npx 02-rbor validate
> npx 02-rbor deps domains/user -f svg
> ```

## 🚀 Quick Start

### 1. Initialize your project

```bash
rbor init
```

This creates a `.rborrc.json` configuration file with your project defaults.

### 2. Generate your first domain

```bash
# Interactive mode — prompts for name and HTTP client
rbor domain

# Or pass the name directly
rbor domain user --http axios
```

This generates a complete domain structure:

```
domains/user/
├── index.tsx              # Barrel export (public API)
├── __test__/              # Test directory
├── components/
│   └── User.tsx           # Main component
├── hooks/
│   ├── useUser.ts         # Controller hook (creates service, wires methods)
│   ├── useUserData.ts     # Data hook (React Query)
│   └── useUserAction.ts   # Action hook (mutations)
├── methods/
│   └── user-logic.ts      # Pure async functions (React-independent)
├── schema/
│   └── user-schema.ts     # Validation schema (zod)
├── services/
│   └── user-service.ts    # Domain service (HTTP layer)
├── types/
│   └── user-types.ts      # TypeScript types
└── utils/
    ├── constant/
    │   ├── user-constants.ts
    │   └── user-endpoints.ts
    └── helper/
        └── user-helpers.ts
```

#### What each folder does

| Folder                | Purpose                                                                                                                                                     | Rules                                                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`components/`**     | React UI. Renders data, handles user interaction.                                                                                                           | Can import from `hooks/`. Nothing else in the domain.                                                                                                      |
| **`hooks/`**          | Wiring layer. Connects React to your domain logic.                                                                                                          | `useUser` creates the service object and passes it to methods. `useUserData` and `useUserAction` provide React Query scaffolds for fetching and mutations. |
| **`methods/`**        | Pure business logic. Every function receives the service as its first argument — no React, no hooks, no global state.                                       | Can import from `services/` and `utils/`. Must stay framework-free so it's easy to test and reuse.                                                         |
| **`services/`**       | HTTP layer. Extends `BaseService` to get an axios (or fetch/ky) instance. Exposes typed `get`, `post`, `put`, `delete` methods with URL param substitution. | Can import from `infrastructure/` and `utils/`.                                                                                                            |
| **`schema/`**         | Validation schemas (zod by default). Define the shape of your domain data for form validation, API response parsing, etc.                                   | Pure data definitions — no side effects.                                                                                                                   |
| **`types/`**          | TypeScript interfaces and types for this domain.                                                                                                            | Pure type definitions.                                                                                                                                     |
| **`utils/constant/`** | Endpoint paths and domain-specific constants (timeouts, config values, feature flags).                                                                      | Pure values — no logic.                                                                                                                                    |
| **`utils/helper/`**   | Domain-specific utility functions (formatters, transformers, parsers).                                                                                      | Pure functions — no React, no service calls.                                                                                                               |
| **`__test__/`**       | Tests for this domain.                                                                                                                                      | Mirrors the folder structure above.                                                                                                                        |
| **`index.tsx`**       | Barrel export — the **only** file other parts of your app should import from.                                                                               | Re-exports the component and anything else that's part of the public API.                                                                                  |

#### How data flows

```
  ┌──────────────────────────────┐
  │  Component  (User.tsx)       │  UI — renders data
  └──────────────┬───────────────┘
                 │ uses hooks
                 ▼
  ┌──────────────────────────────┐
  │  useUserData / useUserAction │  React Query — fetching & mutations
  └──────────────┬───────────────┘
                 │ consumes controller
                 ▼
  ┌──────────────────────────────┐
  │  useUser  (controller hook)  │  creates service, wires methods
  │                              │  ServiceFactory.create('USER')
  └───────┬──────────────┬───────┘
          │              │
          ▼              ▼
  ┌──────────────┐  ┌────────────────────┐
  │  user-logic  │  │  ServiceFactory    │
  │  (methods)   │  │  (infrastructure)  │
  └──────┬───────┘  └────────────────────┘
         │ calls service
         ▼
  ┌──────────────────────────────┐
  │  UserService                 │  extends BaseService
  │  self-registers with Factory │
  └──────────────┬───────────────┘
                 │
                 ▼
  ┌──────────────────────────────┐
  │  BaseService                 │  axios instance, interceptors,
  │  (infrastructure)            │  base URL, timeout
  └──────────────────────────────┘
```

**Dependency Inversion in practice:**

- Lower layers are **stable abstractions** — they define contracts (BaseService, ServiceFactory registry) that don't change when features change.
- Higher layers are **volatile details** — UI, state management, and wiring change frequently.
- Each layer only depends on the layer directly below it, never sideways or upward.
- ServiceFactory never imports domain services — each service self-registers via `ServiceFactory.register()` at the bottom of its file. The controller hook triggers registration by importing the service file.
- `hook-data` and `hook-action` are **independent siblings** — both depend on the controller hook, but never on each other.

### 3. Add endpoints and constants

```bash
cd domains/user
rbor endpoint users/:id/profile    # → USERS_ID_PROFILE
rbor constant timeout=3000         # → TIMEOUT = 3000
```

### 4. Analyze dependencies

```bash
# Who imports this file?
rbor deps domains/user/components/User.tsx -d reverse -f svg -o deps.svg

# What does this file import?
rbor deps src/app/App.tsx -d forward -f tree
```

### 5. Validate architecture

```bash
rbor validate
```

---

## 📚 Commands

| Command                     | Description                                      |
| --------------------------- | ------------------------------------------------ |
| `rbor init`                 | Initialize `.rborrc.json` configuration          |
| `rbor domain [name]`        | Generate a domain (interactive if no name given) |
| `rbor endpoint <path>`      | Add an endpoint to the current domain            |
| `rbor constant <key=value>` | Add a constant to the current domain             |
| `rbor list`                 | List all domains with metadata                   |
| `rbor validate`             | Validate architecture rules                      |
| `rbor deps <path>`          | Analyze dependency graph                         |
| `rbor davinci`              | Credits                                          |

---

### `rbor init`

Initialize rBOR configuration in your project.

```bash
rbor init [options]

Options:
  --http <client>               HTTP client (axios, fetch, ky)
  --domains-path <path>         Path to domains folder
  --infrastructure-path <path>  Path to infrastructure folder
  --force                       Overwrite existing config
```

Creates `.rborrc.json`:

```json
{
  "http": "axios",
  "domainsPath": "domains",
  "infrastructurePath": "infrastructure",
  "schema": { "library": "zod" }
}
```

---

### `rbor domain [name]`

Generate a new domain with the full 02-rBOR structure.

```bash
# Interactive mode (prompts for name, HTTP client, confirmation)
rbor domain

# Direct mode
rbor domain auth
rbor domain products --http ky
```

**What it generates:**

- ✅ Component with TypeScript + JSX
- ✅ Three-hook pattern (controller, data, action)
- ✅ Pure domain logic (methods receive service, stay React-free)
- ✅ Service layer with HTTP client integration
- ✅ Validation schemas (zod)
- ✅ Type definitions
- ✅ Constants and endpoint files
- ✅ Barrel export (index.tsx)

**Hook pattern:**

Three hooks are generated per domain:

- **`use<Domain>`** — Controller hook. Creates a service object and wires up all methods:
- **`use<Domain>Data`** — Data hook. Fetches server state using React Query (commented scaffold).
- **`use<Domain>Action`** — Action hook. Mutation actions via React Query (commented scaffold).

The controller hook wires up services and methods:

```ts
export const useUser = () => {
  const service = ServiceFactory.create('USER') as UserService;

  return {
    getList: () => getUserList(service),
    getById: (id: string) => getUserById(service, id),
    create: (data: unknown) => createUser(service, data),
    update: (id: string, data: unknown) => updateUser(service, id, data),
    remove: (id: string) => deleteUser(service, id),
  };
};
```

> **Note:** If you need access to the Redux store or other global state, access it in the hook and pass values down to your methods. Methods should remain pure async functions.

---

### `rbor endpoint <path>`

Add an API endpoint constant to an existing domain. Run from inside `domains/<domain>/`.

```bash
rbor endpoint users/:id/profile
```

Generates ALL_CAPS keys and appends to `utils/constant/<domain>-endpoints.ts`:

```ts
export const AUTH_ENDPOINTS = {
  LOGIN: '/login',
  USERS_ID_PROFILE: '/users/:id/profile',
} as const;
```

---

### `rbor constant <key=value>`

Add a constant to the current domain's constants file. Run from inside `domains/<domain>/`.

```bash
rbor constant timeout=3000        # → export const TIMEOUT = 3000;
rbor constant maxRetries=5        # → export const MAX_RETRIES = 5;
rbor constant api-url=https://x   # → export const API_URL = 'https://x';
rbor constant debug=true          # → export const DEBUG = true;
```

Auto-detects value types — numbers and booleans stay unquoted, strings get wrapped in quotes.

---

### `rbor list`

List all domains with metadata.

```bash
rbor list    # or: rbor ls
```

---

### `rbor validate`

Enforce 02-rBOR architectural rules.

```bash
rbor validate          # or: rbor lint
rbor validate --strict # treat warnings as errors
```

**What it checks:**

- ❌ **No cross-domain imports** — Domains must not import from each other
- ❌ **Downward-only dependencies** — Page → Component → Hook (data/action) → Hook (controller) → Method → Service → Infrastructure
- ❌ **Sibling isolation** — `hook-data` and `hook-action` must be independent (no importing each other)
- ❌ **No React in methods layer** — Pure logic must be framework-free
- ⚠️ **Barrel exports** — Every domain should have an index.tsx
- ⚠️ **Circular dependencies** — Warns about import cycles

---

### `rbor deps <path>`

Analyze dependency graphs for any file or directory. Traces imports forward (what does this file use?) or reverse (who imports this file?) and renders the result in five different formats — from quick terminal summaries to full SVG diagrams you can open in a browser.

```bash
rbor deps <path> [options]
```

#### Flags

| Flag                  | Short | Description                                            | Default                         |
| --------------------- | ----- | ------------------------------------------------------ | ------------------------------- |
| `--direction <dir>`   | `-d`  | `forward` (imports) or `reverse` (importers)           | `forward`                       |
| `--format <fmt>`      | `-f`  | Output format: `summary`, `tree`, `json`, `dot`, `svg` | `summary`                       |
| `--output <file>`     | `-o`  | Write output to a file instead of stdout               | _(stdout)_                      |
| `--depth <n>`         |       | Maximum traversal depth                                | `10`                            |
| `--include-external`  |       | Include external npm packages in the graph             | `false`                         |
| `--include-tests`     |       | Include test files (`*.test.*`, `*.spec.*`)            | `false`                         |
| `--include-types`     |       | Include type-only imports (`import type { ... }`)      | `true`                          |
| `--aliases <mapping>` |       | Path aliases, e.g. `"@/=src/,@utils/=src/utils/"`      | _(auto-detected from tsconfig)_ |

> **Alias auto-detection:** If your project has a `tsconfig.json` with `compilerOptions.paths`, aliases are read automatically. Use `--aliases` to add extras or override.

#### Direction

**`--direction forward`** (default) — "What does this file import?"

```
          ┌──────────┐
          │ App.tsx  │
          │ (entry)  │
          └────┬─────┘
               │
     ┌─────────┼──────────┐
     ▼         ▼          ▼
 router.ts  store.ts  utils.ts
```

**`--direction reverse`** — "Who imports this file?"

```
 Layout.tsx  Main.tsx  test.tsx
     │         │          │
     └─────────┼──────────┘
               ▼
          ┌──────────┐
          │ App.tsx  │
          │ (target) │
          └──────────┘
```

Use `forward` to understand what a file depends on. Use `reverse` to see a file's consumers — useful for gauging blast radius before a refactor.

#### Output Formats

**`summary`** (default) — Grouped table view in the terminal. Shows imports and importers categorized by file type, plus stats.

```
═══════════════════════════════════════════════════════════════
  FILE SUMMARY: useUser.ts
  Path: domains/user/hooks/useUser.ts
═══════════════════════════════════════════════════════════════

📥 IMPORTS (what this file depends on)
  🔨 method        user-logic.ts
  🏗️ infrastructure ServiceFactory.ts
  📝 type          user-types.ts

📤 IMPORTED BY (what depends on this file)
  📊 hook-data     useUserData.ts
  ⚡ hook-action   useUserAction.ts

📊 STATS
  Nodes: 5  │  Edges: 4  │  Circular: 0
═══════════════════════════════════════════════════════════════
```

**`tree`** — ASCII tree in the terminal. Respects `--depth` to control how deep the traversal goes.

```
📦 domains/user/hooks/useUser.ts
├── 🔨 domains/user/methods/user-logic.ts
│   └── ⚙️ domains/user/services/user-service.ts
│       └── 🏗️ infrastructure/BaseService.ts
├── 🏗️ infrastructure/ServiceFactory.ts
└── 📝 domains/user/types/user-types.ts
```

**`json`** — Full structured output. Contains `nodes`, `edges`, `metadata`, and `stats`. Pipe to `jq` or consume in scripts.

```bash
rbor deps domains/user -f json | jq '.stats'
rbor deps domains/user -f json -o deps.json
```

```json
{
  "nodes": [
    { "id": "domains/user/hooks/useUser.ts", "type": "internal", "category": "hook-controller" }
  ],
  "edges": [
    {
      "source": "domains/user/hooks/useUser.ts",
      "target": "domains/user/methods/user-logic.ts",
      "importType": "static"
    }
  ],
  "metadata": { "direction": "forward", "circularDependencies": [] },
  "stats": { "nodeCount": 5, "edgeCount": 4 }
}
```

**`dot`** — [Graphviz DOT](https://graphviz.org/) format. Use if you have Graphviz installed locally or want to paste into an online viewer.

```bash
rbor deps domains/user -f dot -o deps.dot
dot -Tpng deps.dot -o deps.png          # render with Graphviz
```

**`svg`** — Renders the DOT graph to an SVG image using `@viz-js/viz` (bundled, no external install needed). This is the richest format — color-coded nodes, labeled edges, and circular dependency highlighting.

```bash
rbor deps domains/user -f svg -o deps.svg
# Open deps.svg in your browser or VS Code
```

SVG/DOT node colors:

```
  ┌────────────────────────────┐
  │  🟣 Entry point (purple)   │
  │  🔵 Internal file (blue)   │
  │  🟢 External package (green)│
  │  🟡 Dynamic import (amber) │
  │  ⚪ Built-in module (grey) │
  └────────────────────────────┘
```

#### Circular Dependency Detection

All formats detect and report circular imports. In SVG/DOT output they're visually highlighted:

```
  Normal edge:              Circular edge:

  ┌────────┐                ┌────────┐
  │  A.ts  │                │  A.ts  │ (red border)
  └───┬────┘                └───┬────┘
      │                         │
      ▼                         ▼ ⚠ circular (red edge)
  ┌────────┐                ┌────────┐
  │  B.ts  │                │  B.ts  │ (red border)
  └────────┘                └────────┘

  🔴 Red borders — nodes involved in a cycle
  🔴 Red edges   — the circular import itself, labeled "⚠ circular"
  📋 Legend box   — appears in the bottom-left with the cycle count
```

The `summary` and `tree` formats print `(circular)` inline when a cycle is encountered.

#### Recipes

```bash
# Quick overview of a domain's internal structure
rbor deps domains/auth -f tree --depth 3

# Full SVG graph saved to file
rbor deps domains/auth -f svg -o auth-deps.svg

# Reverse lookup: who depends on this service?
rbor deps domains/auth/services/auth-service.ts -d reverse -f tree

# Include npm packages in the graph
rbor deps src/App.tsx -f svg --include-external -o full-deps.svg

# Shallow analysis (immediate imports only)
rbor deps domains/auth/hooks/useAuth.ts -f summary --depth 1

# JSON for scripting / CI pipelines
rbor deps domains/auth -f json -o deps.json

# Custom aliases (on top of tsconfig auto-detection)
rbor deps src/App.tsx --aliases "@shared/=src/shared/,@lib/=lib/"
```

---

## ⚙️ Configuration

### `.rborrc.json`

```json
{
  "http": "axios",
  "domainsPath": "domains",
  "infrastructurePath": "infrastructure",
  "schema": { "library": "zod" }
}
```

| Option               | Description               | Values                 |
| -------------------- | ------------------------- | ---------------------- |
| `http`               | Default HTTP client       | `axios`, `fetch`, `ky` |
| `domainsPath`        | Where to generate domains | Any path               |
| `infrastructurePath` | Shared infrastructure dir | Any path               |
| `schema.library`     | Validation library        | `zod`, `yup`, `none`   |

CLI flags always override config values.

---

## 🏗️ Architecture Philosophy

**02-rBOR** is built on the **Dependency Inversion Principle** — higher layers control the flow, lower layers remain independent abstractions.

### The Layer Model

```
Layer 0  │  type, schema, constant, config, util     ← importable by anyone (pure data)
Layer 1  │  infrastructure (BaseService, Factory)     ← independent, no domain knowledge
Layer 2  │  service (extends BaseService)             ← depends only on infrastructure
Layer 3  │  method (pure async functions)             ← depends on service, no React
Layer 4  │  hook-controller (useUser)                 ← wires service + methods
Layer 5  │  hook-data / hook-action                   ← consumes controller, independent siblings
Layer 6  │  component (User.tsx)                      ← renders from hooks
Layer 7  │  page (route)                              ← composes components
```

Each layer can import from the **same layer or below**, never above. `hook-data` and `hook-action` are at the same level but must stay independent — both consume the controller, neither consumes the other.

### Why this works

1. **Feature Containerization** — Each domain is self-contained with a single barrel export. The rest of the app imports `from 'domains/user'`, never `from 'domains/user/services/user-service'`.
2. **Downward Dependencies** — Complexity flows down: Page → Component → Hook → Method → Service → Infrastructure. Upper layers orchestrate lower layers, never the reverse.
3. **Layer Separation** — React stays in the component and hook layers. Methods are pure async functions that receive a service object and return data. You can unit test them without rendering anything.
4. **No Cross-Domain Imports** — `domains/auth` must never import from `domains/user`. Shared logic goes in `infrastructure/`.
5. **Service as a Parameter** — Methods don't create their own HTTP clients. They receive the service object from the hook, making them easy to mock and test.
6. **Sibling Isolation** — `useUserData` (fetching) and `useUserAction` (mutations) are independent. They both depend on `useUser` (the controller), but never on each other. This prevents tangled state flows between reads and writes.

### Infrastructure (shared across all domains)

```
infrastructure/
├── BaseService.ts       # Abstract class — creates axios instance, interceptors, base CRUD methods
├── ServiceFactory.ts    # Registry-based factory — services self-register, factory never imports domain code
└── generateURL.ts       # URL builder — replaces :params and appends ?query strings
```

- **BaseService** — Every domain service extends this. It creates an axios instance with configured `baseURL`, `timeout`, and request/response interceptors. Exposes `protected` `get`, `post`, `put`, `delete` methods that all domain services inherit.
- **ServiceFactory** — A registry-based factory. Each domain service calls `ServiceFactory.register('KEY', () => new DomainService())` at the bottom of its own file. The factory never imports domain code — it just stores creators and instantiates on demand via `ServiceFactory.create('KEY')`. This keeps infrastructure fully independent (Dependency Inversion).
- **generateURL** — Utility for URL parameter substitution (`/users/:id` → `/users/42`) and query string building.

---

## 🧪 Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

---

## 💡 Examples

```bash
# Full domain setup
rbor domain auth --http axios
cd domains/auth
rbor endpoint auth/login
rbor endpoint auth/logout
rbor endpoint auth/refresh
rbor constant session-timeout=1800000

# Generate more domains
rbor domain user
rbor domain products --http ky

# Analyze and validate
rbor validate --strict
rbor deps domains/auth -d forward -f svg -o auth-deps.svg
rbor list
```

---

## 📄 License

MIT © [02-davinci-01](https://github.com/02-davinci-01)

---

**rendered to reality by [02-davinci-01](https://02-davinci-01.vercel.app)**
