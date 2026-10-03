---
name: types-enforce-ts
license: Apache-2.0
description: TypeScript type-safety guidance for editing and reviewing `.ts`, `.tsx`, `.mts`, and `.cts` files.
---

# TypeScript Type Safety

Applies only to TypeScript files such as `.ts`, `.tsx`, `.mts`, and `.cts`.

Use this skill when reviewing or editing TypeScript code:

- Preserve runtime behavior and public API shape unless the user asked otherwise.
- Prefer stricter and more precise types over broader types.
- Reuse or extend existing local types instead of creating duplicate one-off types.
- Avoid introducing `any`, unsafe double assertions, or blanket suppressions.
- Replace `any` with concrete types or `unknown` plus narrowing.
- Prefer narrowing and type guards over non-null assertions and forced casts.
- Keep inferred types when they are already clear and stable.
- Do not add explicit return annotations such as `: void` when the return type is obvious from a local implementation; keep them only for exported APIs, overloads, recursive functions, interface conformance, or genuinely clarifying contracts.
- Remove unnecessary casts and non-null assertions where safe.
- Add minimal annotations for function params or returns when clarity or safety improves.
- Align generics, unions, and nullability with real data flow.
- For Lit lifecycle methods that receive changed properties (`shouldUpdate`, `willUpdate`, `update`, `firstUpdated`, `updated`), prefer `changedProperties: PropertyValues<this>` for strict typing.
- For Lit lifecycle methods that need to handle `protected` or `private` changed properties, use `changedProperties: PropertyValues` (without `<this>`) instead of forcing `PropertyValues<this>`.
- Prefer explicit, narrow types.
- Remove unnecessary intermediate variables and one-off aliases when clarity is maintained.
- Inline one-time-use values when clarity is maintained.
- Prefer typing parameters at the signature level when it improves safety or clarity, and rely on inference when types are already clear.
- Avoid casting later at value access points when signature-level typing or narrowing is clearer.
- If project generic helpers exist, prefer concrete generic types over ad-hoc casts and loosely typed objects.
- Prefer top-level annotations and `satisfies` over type assertions when possible.
- Do not introduce local aliases only to satisfy TypeScript narrowing (`const params = this._params`, `const data = this._data`) if direct guards and property access typecheck cleanly.
- Keep control flow simple without changing established logic unless explicitly requested.
- Do not use the non-null assertion operator (`!`) unless it is strictly required and justified by existing project guidance.
- Do not add unnecessary comments or abstractions.
