# 02-rBOR CLI

[![npm version](https://img.shields.io/npm/v/02-rbor.svg)](https://www.npmjs.com/package/02-rbor)
[![CI](https://github.com/02-davinci-01/02-rbor/workflows/CI/badge.svg)](https://github.com/02-davinci-01/02-rbor/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> **Scaffold Clean Architecture-inspired React features with dependency graph analysis**

A CLI tool for building frontend applications following the **02-rBOR** architecture pattern. Generate domain-driven feature modules with proper layering, enforce architectural rules, and analyze dependency graphs — with SVG visualization out of the box.

## 🤔 What is rBOR?

rBOR is an opinionated folder architecture for React apps. Instead of organizing by file type (`components/`, `hooks/`, `services/` at the root), rBOR organizes by **domain** — each feature gets its own self-contained folder with every layer it needs.

The idea: a `user` feature shouldn't scatter its files across 6 different top-level folders. Everything related to `user` lives under `domains/user/`, with a single barrel export (`index.tsx`) as the public API.

Each domain follows a strict **downward dependency rule**:

```
Component  →  Hook  →  Method  →  Service  →  Infrastructure
   (UI)       (wiring)  (logic)    (HTTP)       (shared base)
```

- Upper layers can import from lower layers, never the reverse.
- Methods are pure async functions — no React, no hooks, no state. Just data in, data out.
- Services create the raw API call object. Methods consume it. Hooks wire them together. Components render the result.
- Domains never import from each other. Shared code goes in `infrastructure/`.

## 📦 Installation

```bash
npm install -g 02-rbor
```

Or use with npx:

```bash
npx 02-rbor domain auth
```

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
┌─────────────┐     ┌──────────┐     ┌────────────┐     ┌─────────────┐     ┌──────────────────┐
│  Component  │────▶│   Hook   │────▶│   Method   │────▶│   Service   │────▶│  Infrastructure  │
│  (User.tsx) │     │(useUser) │     │(user-logic)│     │(UserService)│     │  (BaseService)   │
└─────────────┘     └──────────┘     └────────────┘     └─────────────┘     └──────────────────┘
       UI              wiring          pure logic          HTTP calls          axios instance
     renders          creates           receives           extends              interceptors
      data           service &          service as         BaseService           base URL
                    passes to           1st param           ▲                    timeout
                     methods                                │
                                                   ServiceFactory.create()
```

The **ServiceFactory** is the single entry point for creating service instances. When the hook calls `ServiceFactory.create('USER')`, it instantiates `UserService`, which inherits from `BaseService` — that's where the axios instance, interceptors, base URL, and timeout live. The service object gets passed down to your methods, which use it to make API calls.

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
- ❌ **Downward-only dependencies** — Components → Hooks → Methods → Services
- ❌ **No React in methods layer** — Pure logic must be framework-free
- ⚠️ **Barrel exports** — Every domain should have an index.tsx
- ⚠️ **Circular dependencies** — Warns about import cycles

---

### `rbor deps <path>`

Analyze dependency graphs for files or directories.

```bash
rbor deps <path> [options]

Options:
  -d, --direction <dir>    forward | reverse (default: forward)
  -f, --format <fmt>       json | summary | tree | dot | svg (default: summary)
  -o, --output <file>      Write output to file
  --depth <n>              Maximum traversal depth (default: 10)
  --include-external       Include npm packages
  --include-tests          Include test files
```

**Examples:**

```bash
# Tree view of what a file imports
rbor deps src/App.tsx -f tree

# SVG graph of who imports a file (opens in VS Code)
rbor deps domains/auth/components/Auth.tsx -d reverse -f svg -o deps.svg

# JSON output for tooling
rbor deps domains/auth -f json -o deps.json
```

**Circular dependency detection:**

When circular dependencies are found, the SVG/DOT output highlights them:

- 🔴 **Red borders** on nodes involved in cycles
- 🔴 **Red edges** with "⚠ circular" labels
- 📋 **Legend box** showing the cycle count

The tree and summary formats also report circular dependencies inline.

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

**02-rBOR** enforces:

1. **Feature Containerization** — Each domain is self-contained with a single barrel export. The rest of the app imports `from 'domains/user'`, never `from 'domains/user/services/user-service'`.
2. **Downward Dependencies** — Complexity flows down: Component → Hook → Method → Service → Infrastructure. Upper layers can import from lower, never the reverse.
3. **Layer Separation** — React stays in the component and hook layers. Methods are pure async functions that receive a service object and return data. You can unit test them without rendering anything.
4. **No Cross-Domain Imports** — `domains/auth` must never import from `domains/user`. Shared logic goes in `infrastructure/`.
5. **Service as a Parameter** — Methods don't create their own HTTP clients. They receive the service object from the hook, making them easy to mock and test.

### Infrastructure (shared across all domains)

```
infrastructure/
├── BaseService.ts       # Abstract class — creates axios instance, interceptors, base CRUD methods
├── ServiceFactory.ts    # Factory — maps domain keys to service classes (auto-updated by CLI)
└── generateURL.ts       # URL builder — replaces :params and appends ?query strings
```

- **BaseService** — Every domain service extends this. It creates an axios instance with configured `baseURL`, `timeout`, and request/response interceptors. Exposes `protected` `get`, `post`, `put`, `delete` methods that all domain services inherit.
- **ServiceFactory** — A static factory that maps string keys (`'USER'`, `'AUTH'`) to their service class. The CLI auto-updates this file every time you generate a new domain.
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
