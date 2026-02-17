# 02-rBOR CLI

[![npm version](https://img.shields.io/npm/v/02-rbor.svg)](https://www.npmjs.com/package/02-rbor)
[![CI](https://github.com/02-davinci-01/02-rbor/workflows/CI/badge.svg)](https://github.com/02-davinci-01/02-rbor/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> **Scaffold Clean Architecture-inspired React features with dependency graph analysis**

A CLI tool for building frontend applications following the **02-rBOR** architecture pattern. Generate domain-driven feature modules with proper layering, enforce architectural rules, and analyze dependency graphs.

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
rbor domain user --http axios
```

This generates a complete domain structure:

```
domains/user/
├── index.tsx              # Barrel export (public API)
├── components/
│   └── User.tsx          # Main component
├── hooks/
│   ├── useUser.ts        # Controller hook
│   ├── useUserData.ts    # Data hook (React Query)
│   └── useUserAction.ts  # Action hook
├── methods/
│   └── user-logic.ts     # Pure domain logic
├── services/
│   ├── user-service.ts   # Domain service
│   └── service-factory.ts
├── schema/
│   └── user-schema.ts    # Validation schema (zod)
├── types/
│   └── user-types.ts     # TypeScript types
└── utils/
    ├── constant/
    │   └── user-endpoints.ts
    └── helper/
        └── generateURL.ts
```

### 3. Add endpoints

```bash
cd domains/user
rbor endpoint users/:id
rbor endpoint users/profile
```

### 4. Validate architecture

```bash
rbor validate
```

## 📚 Commands

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

**Example:**

```bash
rbor init --http fetch --domains-path src/features
```

Creates `.rborrc.json`:

```json
{
  "http": "fetch",
  "domainsPath": "src/features",
  "infrastructurePath": "infrastructure",
  "schema": {
    "library": "zod"
  }
}
```

---

### `rbor domain <name>`

Generate a new domain with the full 02-rBOR structure.

```bash
rbor domain <name> [options]

Options:
  --http <client>  HTTP client to use (axios, fetch, ky)
```

**Examples:**

```bash
# Use default from .rborrc.json
rbor domain auth

# Override with specific HTTP client
rbor domain products --http ky
```

**What it generates:**

- ✅ Component with TypeScript + JSX
- ✅ Three-hook pattern (controller, data, action)
- ✅ Service layer with HTTP client integration
- ✅ Pure domain logic (methods)
- ✅ Validation schemas (zod)
- ✅ Type definitions
- ✅ Utility functions and constants
- ✅ Barrel export (index.tsx)

---

### `rbor endpoint <path>`

Add an API endpoint constant to an existing domain.

```bash
rbor endpoint <path>
```

**Examples:**

```bash
cd domains/auth
rbor endpoint login
rbor endpoint users/:id/profile
```

Appends to `utils/constant/<domain>-endpoints.ts`:

```ts
export const AUTH_ENDPOINTS = {
  login: '/login',
  userProfile: '/users/:id/profile',
};
```

---

### `rbor list`

List all domains in your project with metadata.

```bash
rbor list
```

**Output:**

```
📦 rBOR Domains
   Path: domains/

───────────────────────────────────────────────────────────
   📁 auth
      Files: 15  |  Endpoints: 3  |  Service: ✅  |  Schema: ✅
      Folders: components, hooks, methods, services, types, utils

   📁 user
      Files: 12  |  Endpoints: 2  |  Service: ✅  |  Schema: ✅
      Folders: components, hooks, methods, services, types, utils
───────────────────────────────────────────────────────────
   Total: 2 domain(s)
```

---

### `rbor validate`

Enforce 02-rBOR architectural rules across your codebase.

```bash
rbor validate [options]

Options:
  --strict  Treat warnings as errors
```

**What it checks:**

- ❌ **No cross-domain imports** — Domains must not import from each other
- ❌ **Downward-only dependencies** — Components can't import from hooks, hooks can't import from methods
- ❌ **No React in methods layer** — Pure logic must be framework-free
- ⚠️ **Barrel exports** — Every domain should have an index.tsx
- ⚠️ **Circular dependencies** — Warns about import cycles

**Example output:**

```
🔍 Validating rBOR architecture...
   Domains path: domains/

═══════════════════════════════════════════════════════════
❌ [no-cross-domain-import] Cross-domain import: "auth" imports from "user"
   File: domains/auth/services/auth-service.ts:5
   Fix:  Move shared code to a shared/ or infrastructure/ layer

⚠️  [barrel-export] Domain "products" is missing a barrel index file
   File: domains/products
   Fix:  Create an index.tsx that re-exports the domain's public API
═══════════════════════════════════════════════════════════
   1 error(s), 1 warning(s)
```

---

### `rbor deps <path>`

Analyze dependency graphs for files or directories.

```bash
rbor deps <path> [options]

Options:
  -d, --direction <dir>    Analysis direction (forward, reverse)
  -f, --format <fmt>       Output format (json, summary, tree, dot)
  -o, --output <file>      Write output to file
  --depth <n>              Maximum traversal depth
  --include-external       Include npm packages
  --include-tests          Include test files
```

**Examples:**

```bash
# Show what a file imports
rbor deps src/App.tsx --format tree

# Show what imports a file (reverse dependencies)
rbor deps src/utils/api.ts -d reverse

# Generate DOT graph for visualization
rbor deps domains/auth --format dot -o auth-deps.dot
dot -Tpng auth-deps.dot -o auth-deps.png
```

---

## ⚙️ Configuration

### `.rborrc.json`

Project-level configuration file (created by `rbor init`):

```json
{
  "http": "axios",
  "domainsPath": "domains",
  "infrastructurePath": "infrastructure",
  "schema": {
    "library": "zod"
  }
}
```

**Options:**

- `http` — Default HTTP client for new domains (`axios`, `fetch`, `ky`)
- `domainsPath` — Where to generate domain folders
- `infrastructurePath` — Shared infrastructure directory
- `schema.library` — Validation library for schemas (`zod`, `yup`, `none`)

CLI flags always override config file values.

---

## 🏗️ Architecture Philosophy

The **02-rBOR** architecture enforces:

1. **Feature Containerization** — Each domain is self-contained with a single public entry point
2. **Downward Dependencies** — Complexity flows down: Component → Hook → Method → Service → Infrastructure
3. **Layer Separation** — React code stays in UI, business logic is framework-free
4. **No Cross-Domain Imports** — Domains communicate through shared infrastructure, never directly

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full architectural specification.

---

## 🧪 Testing

The package includes a comprehensive test suite:

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:ui       # Visual test UI
npm run test:coverage # Coverage report
```

**Test coverage:**

- ✅ 74 unit tests
- ✅ Naming utilities (PascalCase, kebab-case conversions)
- ✅ Import parser (regex-based AST-lite)
- ✅ File categorizer (component, hook, service detection)
- ✅ Graph builder and output formatters

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
git clone https://github.com/02-davinci-01/02-rbor.git
cd 02-rbor
npm install
npm run build
npm link
```

Now `rbor` is available globally for testing.

---

## 📄 License

MIT © [02-davinci-01](https://github.com/02-davinci-01)

---

## 🔗 Links

- [GitHub Repository](https://github.com/02-davinci-01/02-rbor)
- [Issue Tracker](https://github.com/02-davinci-01/02-rbor/issues)
- [Architecture Specification](./docs/ARCHITECTURE.md)
- [Changelog](./CHANGELOG.md)

---

## 💡 Examples

### Generate a complete authentication feature

```bash
rbor domain auth --http axios
cd domains/auth
rbor endpoint auth/login
rbor endpoint auth/logout
rbor endpoint auth/refresh
```

### Set up a product catalog

```bash
rbor domain products --http fetch
cd domains/products
rbor endpoint products
rbor endpoint products/:id
rbor endpoint products/:id/reviews
```

### Analyze and validate

```bash
rbor validate                    # Check architecture rules
rbor list                        # See all domains
rbor deps domains/auth -f tree   # Visualize dependencies
```

---

**Built with ❤️ for scalable React architectures**
