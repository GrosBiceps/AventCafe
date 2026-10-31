---
name: vercel-react-native-skills
description: React Native and Expo best practices for building performant mobile apps. Use when writing, reviewing, or optimizing React Native or Expo code.
license: MIT
metadata:
  author: vercel
  version: "1.0.0"
---

# React Native Skills

Best practices for React Native and Expo development, organized by performance impact.

## When to Apply

- Building new React Native or Expo screens/components
- Optimizing list rendering or animations
- Reviewing mobile performance issues
- Configuring navigation patterns
- Setting up monorepo with native dependencies

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | List Performance | CRITICAL | `list-performance-` |
| 2 | Animation | HIGH | `animation-` |
| 3 | Navigation | HIGH | `navigation-` |
| 4 | UI Patterns | HIGH | `ui-` |
| 5 | State Management | MEDIUM | `react-state-` / `react-compiler-` |
| 6 | Rendering | MEDIUM | `rendering-` |
| 7 | Monorepo | MEDIUM | `monorepo-` |
| 8 | Configuration | LOW | various |

## Quick Reference

### List Performance (CRITICAL)

- `list-performance-virtualize` — Use FlashList for large lists instead of FlatList/ScrollView
- `list-performance-item-memo` — Memoize list item components to prevent unnecessary re-renders
- `list-performance-callbacks` — Stabilize callbacks passed to list items with useCallback
- `list-performance-inline-objects` — Avoid inline object/array creation in list render props
- `list-performance-function-references` — Pass stable function references to list props
- `list-performance-images` — Use expo-image for list images with caching
- `list-performance-item-expensive` — Extract expensive computations from list item render
- `list-performance-item-types` — Use getItemType to help FlashList recycle correctly

### Animation (HIGH)

- `animation-gpu-properties` — Animate only transform and opacity (GPU-accelerated)
- `animation-derived-value` — Use derived values in Reanimated for computed animations
- `animation-gesture-detector-press` — Use GestureDetector + Tap for pressable animated elements

### Navigation (HIGH)

- `navigation-native-navigators` — Use native stack and tab navigators, not JS-based ones

### UI Patterns (HIGH)

- `ui-expo-image` — Use expo-image for all image rendering
- `ui-image-gallery` — Use flash-list + expo-image for image galleries
- `ui-pressable` — Use Pressable instead of TouchableOpacity
- `ui-safe-area-scroll` — Combine SafeAreaView with ScrollView correctly
- `ui-scrollview-content-inset` — Use contentInset for scroll content offsets
- `ui-menus` — Use zeego for native context menus
- `ui-native-modals` — Use expo-router modals for native sheet behavior
- `ui-measure-views` — Use onLayout or measure() for view dimensions
- `ui-styling` — Use StyleSheet.create for static styles

### State Management (MEDIUM)

- `react-state-minimize` — Keep state minimal; derive values where possible
- `react-state-dispatcher` — Use dispatch pattern for complex state transitions
- `react-state-fallback` — Always provide fallback values for async state
- `react-compiler-destructure-functions` — Destructure props for React Compiler compatibility
- `react-compiler-reanimated-shared-values` — Access shared values correctly with React Compiler

### Rendering (MEDIUM)

- `rendering-text-in-text-component` — Always wrap text in <Text> component
- `rendering-no-falsy-and` — Avoid `{count && <Component />}` pattern; use ternary

### Monorepo (MEDIUM)

- `monorepo-native-deps-in-app` — Keep native dependencies in the app package, not shared packages
- `monorepo-single-dependency-versions` — Use a single version of React Native across the monorepo

### Configuration (LOW)

- `fonts-config-plugin` — Load fonts via Expo config plugin, not useFont hook
- `imports-design-system-folder` — Alias design system imports for clean paths
- `js-hoist-intl` — Hoist Intl formatters to module level
