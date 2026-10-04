---
name: testing
license: Apache-2.0
description: Choose tests for their concrete regression value, avoid low-value coverage, and verify changes by exercising the real built behaviour. Use during implementation, fixes, planning, diagnosis, and code review when choosing verification, adding or changing tests, considering a missing-test finding, or when the user asks to test, check, or verify a change.
---

# Testing

## Tests Should Earn Their Place

- Add or request tests when they catch a meaningful failure or protect important behaviour that existing checks do not already cover. Ordinary cases can be worthwhile; a test does not need to cover a rare edge case.
- State the specific failure the test would catch and why that matters. An existing test file or helper, a convenient test seam, or the fact that code changed is not enough. Apply the same standard to new files and extra cases in existing files.
- Honour explicit user requests and repository requirements. Do not use TDD, red-green-refactor, or test-first workflows.
- Computations, data processing, utilities, config validation, and strategies are eligible areas, not automatic reasons to add tests. Do not cover every scenario, chase coverage, mirror the implementation, or exhaustively test behaviour that changes often.
- If the value is uncertain, briefly describe the proposed test and what it would catch, then ask the user once. Tests with a clear benefit need no extra approval.

## Rendering And Review

- Do not add rendering tests for views, panels, or components. This includes assertions about text, CSS classes, styles, slots, option defaults, and templates that only display context or helper data.
- Do not request new tests for visual components in review. For a clear visual change without screenshots or videos, suggest adding that evidence instead. Capturing it still requires the applicable browser permission.
- Test meaningful logic behind a UI at its existing boundary rather than building a rendering harness around it.
- A missing test is not a finding merely because code changed. Any test request must explain the meaningful failure left unprotected in the scoped change. Honour stricter repository prohibitions.

## Verification

- Prove the change works by using the real thing where you can: run the built command, app, service, or UI the way a user would. Unit and e2e tests are part of testing too, and may be exactly what the user means by "test it"; if the request doesn't make clear which, run the relevant suites and offer the real-world check as well rather than treating either one as the whole answer.
- Run the real thing read-only by default: help output, status and list commands, dry runs, or reading live state. Do not write to real config, data, or accounts to prove a change.
- When a meaningful check would write, ask first and offer a safe target where the tool supports one: a throwaway directory, an overridden config or save location, or a separate profile or session. Use it only once the user agrees.
- When you cannot run it yourself (hardware, a desktop session, credentials, or a running service you should not touch), tell the user exactly what to run or where to look and what they should see.
- Repository instructions may add specific checks, such as browser testing against a dev server; follow them.
- Run relevant existing checks and repository-required validation. Prefer the smallest reliable check or direct observation for the changed behaviour.
- When checks and result collection form useful independent work and delegation is available, hand them to a smaller, lower-effort helper against a stable revision. Use a background shell for a known command that needs no interpretation. Test design and unexplained failures can require stronger reasoning; do not route all testing work to a smaller model or let a check runner weaken assertions.
- Maintain an existing test when an intentional behaviour change makes it stale; that does not authorise extra cases or broader coverage. Do not delete or weaken tests just to obtain a pass.
- Do not introduce test infrastructure, extract helpers, or redesign production code solely to make an optional test possible.
- After checks pass, broaden or repeat them only for new changes, failures, or unresolved concerns. State verification limits plainly.
