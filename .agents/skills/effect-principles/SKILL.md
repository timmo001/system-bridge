---
name: effect-principles
license: Apache-2.0
description: Apply the Effect way of reasoning in codebases that do not use Effect, in any programming language. Use when editing or reviewing non-Effect code so dependencies, failures, state, boundaries, resources, time, and workflows stay explicit without adding Effect-shaped architecture or broader scope.
---

# Effect Principles Without Effect

Use the discipline behind Effect's APIs, not Effect's APIs themselves. Express it through the current language's native features and the repository's existing conventions, dependencies, and architecture.

For any bounded task, follow `changeset-scope`; this skill supplies engineering criteria but never expands investigation, finding, or edit scope.

## Hard Gate

Apply a principle only when the resulting change:

- stays inside the scope and amount of change the user requested;
- when working from a branch, diff, pull request, or injected work scope, is directly required by those changes;
- uses existing language or repository constructs;
- does not add Effect, an Effect substitute, a dependency container, a generic result type, or a new architectural layer;
- does not increase conceptual surface area, indirection, or the amount a reader must learn;
- is at least as readable as the code it replaces.

The user's guidance on how much to change is authoritative. Do not treat this skill as permission to improve nearby code. If meeting a principle requires more files, callers, wrappers, types, helpers, or abstractions than the scoped behaviour requires, keep the existing design. Report a larger opportunity separately only when the user asked for architectural advice.

## Workflow

1. Establish the boundary with `changeset-scope`, then read the nearest project guidance and enough surrounding code to understand it.
2. Identify only the concrete ambiguities introduced, modified, or exposed by that scope: untrusted input, implicit dependencies, expected failures, invalid states, uncontrolled side effects, retry policy, resource lifetime, or concurrent workflows.
3. Find the smallest existing seams that own them. Prefer function signatures, local unions, existing interfaces, adapters, parsers, platform primitives, or framework lifecycles already in use.
4. Tighten the relevant seams together when scoped behaviour crosses them. Change callers outside the original files only when required to keep that behaviour correct; do not propagate the pattern further.
5. Compare the result against the hard gate. Revert the idea if it adds more ceremony than truth.
6. Apply `testing` and run the smallest reliable verification that proves the changed contract. Add tests when they protect important behaviour or catch a meaningful failure that existing checks miss.

## Principles

### Make requirements visible

- Pass a dependency as an existing parameter or constructor field when the caller already chooses it.
- Keep ambient framework state where the framework owns it; do not introduce dependency injection merely to imitate Effect context.
- Do not create an interface for a single concrete value unless a real boundary or existing test seam already calls for one.

### Make invalid states harder to express

- Prefer the repository's existing sum types, tagged variants, enums, constrained value types, schemas, guards, and state machines.
- Narrow broad or nullable values at the boundary instead of scattering casts and checks through consumers.
- Add a new model only when it removes at least as much branching or ambiguity as it introduces.

### Treat failures according to their contract

- Distinguish expected failures only when callers handle them differently.
- Use the codebase's existing error mechanism: exceptions, rejected promises, error classes, status objects, or established result types.
- Preserve unexpected defects and context. Do not catch, wrap, or convert every failure for uniformity.
- Recover, retry, or fall back only at the boundary that can make a truthful decision.

### Keep workflows explicit

- Keep sequencing, cleanup, cancellation, retry limits, and ownership visible in the function that controls them.
- Prefer native and existing primitives for cleanup, cancellation, lifecycle, queues, asynchronous work, and scheduling.
- Do not build generic pipeline, schedule, scope, or resource helpers for one workflow.

### Keep pure decisions separate from effects when natural

- Extract a pure decision only when it has a clear name, removes duplication, or can be understood independently.
- Keep one-off logic inline when extraction would create a shallow helper or split a readable operation.
- Keep transport and framework adapters thin when an existing domain or application function already owns the rule; do not create that layering solely for symmetry.

### Make concurrency and time deliberate

- State whether work is sequential, concurrent, cancellable, retried, or best-effort when the behaviour matters.
- Prefer deterministic synchronization already available in the project over arbitrary sleeps.
- Add retry, caching, batching, or background work only when required by the task and supported by the operation's real semantics.

## Translation Guide

Use this to recognise Effect's intent without reproducing its API surface:

| Effect discipline | Non-Effect expression |
| --- | --- |
| Requirements in the environment | Existing parameters, constructor fields, context, or framework injection |
| Typed error channel | Existing distinguishable expected-error contract |
| Schema at boundaries | Existing parser, validator, guard, schema library, or explicit narrowing |
| Tagged state | Existing sum type, tagged variant, enum, or state machine |
| Scoped resources | Existing lifecycle, cleanup construct, disposal, or cancellation handling |
| Schedule | Existing bounded retry or timing policy near the owning operation |
| Structured concurrency | Owned promises/tasks with explicit cancellation and joining |
| Service and Layer | Existing interface and composition root, but only when both already have a reason to exist |

## Do Nots

- Do not add Effect or recreate `Effect`, `Layer`, `Context`, `Exit`, `Cause`, `Option`, or `Either` under local names.
- Do not replace the language's ordinary async, exception, optional-value, or framework-state patterns project-wide.
- Do not add wrappers that only rename a platform or library API.
- Do not turn local implementation details into public contracts.
- Do not widen a focused fix into a domain-model, service, validation, or error-handling migration.
- Do not claim a change is safer when its new ceremony obscures the control flow.
