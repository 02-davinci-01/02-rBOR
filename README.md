# 02-rBOR Architecture

**02-rBOR** is a Clean Architecture–inspired, containerized, hook-driven React architecture designed to keep frontend systems scalable, readable, and resistant to “mega-hook” and “god-component” decay.

This document is the **authoritative, living specification** of the architecture.

---

## What 02-rBOR Is

**02-rBOR** stands for:

> **recursive → Bifurcate → Orchestrate → Render**

It describes how complexity should *flow* in a frontend system:

1. **Render** a feature boundary
2. **Bifurcate** into containers, components, hooks, and logic
3. **Orchestrate** behavior and data via controller hooks
4. **Render** again at the leaves using pure UI components

> **Complexity fans out — it never piles up.**

---

## Who This Architecture Is For

02-rBOR is designed for developers who:

- Want predictable, reviewable frontend structure
- Care about long-term maintainability over short-term convenience
- Prefer explicit boundaries over “smart” abstractions
- Use React with hooks, React Query, and optionally Redux

This architecture is **not** a framework or boilerplate.
It is a **way of thinking and organizing code**.

---

## Core Philosophy

- Structure follows responsibility
- Boundaries matter more than cleverness
- Hooks orchestrate, they do not decide
- Logic should survive outside React
- Indirection is a cost — pay it only when it buys something real

02-rBOR is:
- Clean Architecture–inspired
- Feature-container–based
- Hook-first (but not hook-heavy)
- Explicit about dependency direction

---

## The Mental Model (Non-Negotiable)

```
Feature Entry (index.tsx)
   ↓
Feature Container (View / Layout)
   ↓
Controller Hooks (orchestration)
   ↓
Data Hooks (React Query / Redux)
   ↓
Pure Domain Logic
   ↓
Infrastructure (API, storage)
```

**Dependencies only flow downward.  
Upward imports are forbidden.**

---

## Feature Containerization

Each feature is a **self-contained unit** with **one public entry point**.

### Canonical Feature Structure

```
feature-name/
├── index.tsx                ← ONLY public export
├── FeatureView.tsx          ← Container / layout
├── components/              ← Dumb UI components
│   ├── Header.tsx
│   ├── List.tsx
│   └── EmptyState.tsx
├── hooks/                   ← Feature-local hooks
│   ├── useFeature.ts        ← Controller hook
│   └── useFeatureActions.ts
├── domain/                  ← Pure logic
│   └── rules.ts
├── api/                     ← Infrastructure
│   └── service.ts
├── types.ts
└── constants.ts
```

### Rules

- ❌ No cross-feature imports
- ❌ No shared logic leaking upward
- ✅ Feature is portable and replaceable

---

## Layer Responsibilities

### 1. Feature Entry (`index.tsx`)

**Responsibility**
- Declare the feature boundary

**Rules**
- ❌ No hooks
- ❌ No logic
- ❌ No side effects
- ✅ One default export

> This file is the **public API** of the feature.

---

### 2. Feature Container (View / Layout)

**Responsibility**
- Compose UI
- Wire hooks to components

**Rules**
- ✅ Call controller hooks
- ❌ No business rules
- ❌ No heavy computation

> Containers orchestrate — they don’t decide.

---

### 3. Controller Hooks

**Responsibility**
- Orchestrate data flow
- Compose data hooks + domain logic

**Rules**
- ❌ No UI concerns (toasts, i18n, routing)
- ❌ No side effects
- ❌ No direct storage access
- ✅ Thin and readable

> Hooks coordinate — logic lives elsewhere.

---

### 4. Data Hooks (State Layer)

Includes:
- React Query (server state)
- Redux (client/UI state only)

**Rules**
- Server state → React Query
- Client/UI state → Redux
- ❌ No formatting
- ❌ No interpretation
- ❌ No translations

---

### 5. Domain Layer (Pure Logic)

**Responsibility**
- Business rules
- Data transformation
- Interpretation

**Rules**
- ✅ No React imports
- ✅ No hooks
- ✅ Fully testable
- ❌ No side effects

> If React isn’t required, React must not be imported.

---

### 6. Infrastructure Layer

Includes:
- API services
- Storage
- External integrations

**Rules**
- No UI knowledge
- No business logic
- Replaceable without refactors

---

## Allowed Hook Types (Strict)

1. **UI Hooks**
   - `useToggle`, `useTabs`
   - Local state only

2. **Data Hooks**
   - `useUserQuery`
   - Fetch + return raw state

3. **Controller Hooks**
   - `useFeature`
   - Compose hooks, expose UI-ready state

### Forbidden Patterns

- ❌ Mega-hooks
- ❌ Hooks with toasts
- ❌ Hooks with i18n
- ❌ Hooks validating auth
- ❌ Hooks reaching into global state implicitly

---

## Error Handling Philosophy

- Hooks **return errors**
- Containers/components **decide reactions**

```ts
useEffect(() => {
  if (error) showToast(...)
}, [error])
```

---

## Progressive Bifurcation Principle

> As complexity grows, split **downward**, never **sideways**.

- Components split into smaller components
- Hooks split into smaller hooks
- Logic splits into pure functions

No file should grow endlessly.

---

## 02-rBOR Review Checklist

Before approving code, ask:

- [ ] Does this feature have a single public entry?
- [ ] Are hooks orchestrating rather than deciding?
- [ ] Is domain logic React-free?
- [ ] Are side effects confined to components?
- [ ] Do dependencies flow only downward?
- [ ] Is complexity fanning out instead of piling up?

If any answer is “no”, the design needs revisiting.

---

## When It’s Acceptable to Bend 02-rBOR

Rules may be relaxed **only if all are true**:

- Feature is page-specific
- No reuse expected
- Tight deadline
- Trade-off is explicitly acknowledged

Otherwise, follow the architecture.

---

## Final Principle

> **One entry.  
Thin orchestration.  
Pure logic.  
Downward dependencies.  
Complexity fans out.**

---

## Status

This document is a **living specification**.

It will evolve as:
- real-world friction reveals better boundaries
- new patterns earn their place
- old assumptions are proven wrong

02-rBOR is not dogma — it is a disciplined starting point.
