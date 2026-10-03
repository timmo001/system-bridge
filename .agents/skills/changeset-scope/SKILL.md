---
name: changeset-scope
license: Apache-2.0
description: Keep all scoped code work contained to the user-defined changeset. Use for implementation, fixes, diagnosis, refactoring, cleanup, and review when explicit instructions, named files, diffs, branches, pull requests, or injected work scopes define the boundary.
---

# Changeset Scope

This skill owns containment, not scope discovery. Use the scope supplied by the user, command, agent, or context provider. When `branch-context-consumer` is active, it remains authoritative for parsing the injected scope.

Apply this contract before investigation, delegation, domain skills, or execution so later work cannot silently widen the boundary.

## Resolve The Boundary

Use the first applicable source:

1. Explicit user instructions about files, behaviour, concerns, or amount of change.
2. The review, diff, pull request, injected work scope, or named changeset supplied by the current workflow.
3. Current branch changes against their base when the task concerns that branch.
4. For standalone implementation only, the files and callers required to complete the requested behaviour.

A narrower user instruction always narrows a broader supplied changeset. Do not widen an explicit scope without asking.

The boundary is a hard limit, not a starting point for discovery. Similarity, proximity, shared ownership, or an opportunity for consistency does not bring code into scope.

## Context Is Not Scope

- Read unchanged files, callers, tests, history, and documentation when needed to understand changed behaviour.
- Do not turn issues found in that surrounding context into independent findings or edits.
- Follow outside the initial files only when the changeset alters their behaviour or they provide evidence that a changed path is incorrect.
- Use surrounding code to detect a conflict with an existing contract or an existing implementation the changed code should reuse. Report it only when the changed code creates the conflict or concrete duplication; anchor the finding to the changed line, not the unchanged context.
- Treat unrelated pre-existing problems as out of scope. Mention one only as a residual risk when it directly limits confidence in the scoped work.

## Reviews

- Every finding must identify a problem introduced or worsened by the changeset. A pre-existing problem, even in a touched file, is not a finding unless the changeset makes its impact worse.
- Anchor each finding to a changed line and explain the concrete path from that line to the failure. If that trace cannot be made, omit the finding.
- Apply every companion skill as criteria within this same boundary. Loading a type, framework, cleanup, security, or engineering-principles skill never expands finding scope.
- Do not recommend unrelated cleanup, migration, redesign, or consistency work as review findings.
- Do not inventory all violations of a loaded skill. Evaluate only changed code and changed behaviour against it.
- Do not expand review scope to make a suggested fix more complete. Give the smallest fix direction that resolves the scoped problem.
- Do not add praise, optional improvements, or nice-to-haves to fill out an otherwise empty review.
- Reviews remain read-only unless the user separately asks for implementation.

## Implementation And Refactoring

- Edit only what the requested behaviour requires.
- Change callers outside the initial files only to preserve or complete the scoped contract; stop propagation at the first stable boundary.
- Do not use a scoped task to standardise nearby code or adopt a pattern across the subsystem.
- Do not add adjacent cleanup because a file is already being edited.
- If correctness requires materially broader work, explain why and ask before widening scope.

## Diagnosis And Investigation

- Investigate the scoped symptom or changed behaviour, not the health of the surrounding subsystem.
- Trace dependencies and callers as evidence, but do not convert newly observed adjacent problems into work items.
- Instrument or reproduce only as broadly as needed to distinguish causes of the scoped problem.
- A root cause outside the initial files may enter scope only when evidence shows it causes the requested failure; stop once that causal path is corrected.

## Delegation

- Give delegated agents the same explicit boundary and state that surrounding reads are context only.
- Treat subagent suggestions outside the boundary as out of scope, regardless of their severity or usefulness.
- Do not let parallel exploration combine into a broader aggregate task than the user requested.

## Reporting

State the scope source used. If no scoped finding or safe edit exists, say so rather than substituting adjacent work.
