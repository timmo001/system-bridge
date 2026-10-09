---
name: code-review
license: Apache-2.0
description: Review a pull request, branch, work-in-progress changes, or diff for concrete defects, unmet requirements, and repository convention violations. Keep findings scoped, evidenced, and proportionate.
---

# Code Review

Load `changeset-scope` first, then `effect` for Effect code or
`effect-principles` for other code and independently matching specialist skills.
Report only problems introduced or worsened by the changeset.

## Review

- Establish the intended behaviour from the user's request and available issue,
  PR, or spec. State missing context rather than inventing requirements.
- Read changed code and its callers to trace actual behaviour. Prioritise
  correctness, compatibility, security, resource handling, and meaningful
  performance risks where the change touches them.
- Follow repository guidance and nearby patterns. In shared repos, consult the
  user's recently merged work when style is unclear. Cite the rule or precedent
  for convention findings; skip what linting and formatting already enforce.
- Do not turn code-smell labels, personal preferences, or hypothetical reuse
  into findings. Recommend structural changes only to resolve a concrete problem.
- Apply `testing` when choosing checks or considering test requests. Missing
  coverage alone is not a finding; explain the meaningful failure left unprotected.
- Keep straightforward reviews direct. When a concrete reasoning risk or
  independent review area warrants another perspective, apply
  `session-coordination` to propose a Herdr reviewer with a stronger model or
  higher effort. Give it the same boundary and applicable skills, and verify its
  claims before reporting them. Delegate mechanical evidence collection separately
  when useful; do not make another reviewer a mandatory step for every change.

## Findings

Each finding needs:

- A precise file and line in the change.
- A concrete failure path or violated requirement, with the triggering conditions.
- The impact and smallest useful fix direction.

Quote code or include a short example only when it helps establish the problem.
If the evidence is incomplete, state the unresolved question or verification
limit instead of presenting speculation as a defect.

## Delivery

Lead with findings ordered by severity, then material open questions or remaining
risks. Keep requirements and repository conventions in view without forcing
separate report sections. If there are no concrete findings, say so and briefly
state any verification limits. Give an approval recommendation when requested.

Keep the review read-only unless edits are separately requested. Posting review
comments, changing PR text, and switching the user's checkout each require the
appropriate explicit authorisation. Use the available read-only GitHub tools for
PR context; consult owning docs or source for uncertain API behaviour.
