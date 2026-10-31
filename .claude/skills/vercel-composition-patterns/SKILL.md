---
name: vercel-composition-patterns
description: React composition patterns that scale. Use when refactoring components with boolean prop proliferation, building flexible component libraries, or designing reusable APIs.
license: MIT
metadata:
  author: vercel
  version: "1.0.0"
---

# React Composition Patterns

Guide for building scalable React component architectures through composition rather than boolean prop proliferation.

## When to Apply

- Refactoring components that have accumulated many boolean props
- Building reusable component libraries
- Designing flexible component APIs
- Reviewing component architecture
- Working with compound components or context providers

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Component Architecture | HIGH | `architecture-` |
| 2 | State Management | MEDIUM | `state-` |
| 3 | Implementation Patterns | MEDIUM | `patterns-` |
| 4 | React 19 APIs | MEDIUM | `react19-` |

## Quick Reference

### Component Architecture (HIGH)

- `architecture-avoid-boolean-props` — Avoid boolean customization props; use composition instead
- `architecture-compound-components` — Implement compound components with shared context for complex UIs

### State Management (MEDIUM)

- `state-decouple-implementation` — Provider is the only place that knows how state is managed
- `state-context-interface` — Define generic interfaces for context to allow multiple implementations
- `state-lift-state` — Elevate state to provider components rather than scattering it

### Implementation Patterns (MEDIUM)

- `patterns-explicit-variants` — Prefer explicit variant components over boolean mode props
- `patterns-children-over-render-props` — Favor children composition over render prop patterns

### React 19 APIs (MEDIUM)

- `react19-no-forwardref` — Avoid forwardRef in React 19+; use ref as a regular prop
- `react19-use-context` — Replace useContext() with use() for cleaner context consumption

## Core Principles

**Avoid Boolean Props**
Instead of `<Button disabled primary large />`, compose: `<PrimaryButton size="lg" />` or use compound patterns.

**Compound Components**
Components that share implicit state through context:
```tsx
<Select>
  <Select.Trigger />
  <Select.Content>
    <Select.Item value="a">Option A</Select.Item>
  </Select.Content>
</Select>
```

**Provider Encapsulation**
The provider is the single source of truth for state implementation. Consumers should not need to know how state is managed internally.

**Children over Render Props**
Prefer `children` for composition; use render props only when you need to pass data back to the parent's render scope.
