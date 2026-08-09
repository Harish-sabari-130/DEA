---
name: Workspace compatibility
description: Compatibility notes for generated validation and Vite/Tailwind parsing in this workspace.
---

Use numeric OpenAPI schemas instead of integer schemas when generating Zod validation in this workspace; the installed Zod runtime is v3-compatible and generated `zod.int()` calls fail typechecking.

**Why:** Codegen completed, but the generated library failed until integer fields were represented as numbers.

**How to apply:** If integer semantics are important, enforce them at the route boundary with a refinement or explicit runtime check rather than relying on generated integer output.

Prefer simple CSS gradients over quoted SVG data-URI textures in Tailwind v4 stylesheet rules.

**Why:** The Vite/Tailwind parser rejected the generated stylesheet's quoted SVG data URI and prevented the entire frontend from transforming.

**How to apply:** Keep decorative texture rules parser-simple and validate the live preview after frontend changes.