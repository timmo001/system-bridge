---
name: lit-rendering
license: Apache-2.0
description: Lit rendering and picker callback-shape guidance. Use when editing or reviewing Lit component render logic, derived render data, memoization, or picker callbacks.
---

# Lit Rendering

Use this skill when reviewing or editing Lit rendering logic:

- Preserve runtime behavior and public API shape unless the user asked otherwise.
- Prefer render-local derived values for UI-only structures (`sections`, `options`, grouped labels, display rows).
- Compute derived render data once per render and reuse it across template call sites.
- Do not create render-local booleans, labels, classes, or wrapper variables unless they are reused, clarify a complex branch, or prevent repeated expensive/side-effectful work. For example, avoid `const params = this._params`, `const data = this._data`, or `const selected = this._selected` when direct `this._xyz` access is just as clear and typechecks.
- Use `memoizeOne` only for pure transforms with explicit, narrow inputs.
- Do not memoize using broad inputs (`this`, large mutable objects) when narrower inputs are available.
- Do not widen signatures with pass-through values when class/context access already exists.
- Do not add passthrough fields used only to thread values through helper calls.
- Do not add `@state` fields or `willUpdate` only to cache render-derived picker data.
- Use lifecycle hooks for real update-phase behavior, not as a substitute for render-local composition.
- When replacing a component's built-in header with a custom conditional header, preserve the original header/title behavior on every branch that does not render the custom header.
- Do not add unnecessary comments or abstractions.
