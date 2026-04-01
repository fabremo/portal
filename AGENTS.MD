# AGENTS.md

## Goal
Work as a practical coding agent for this repository.
Prioritize correctness, small safe changes, maintainability, and alignment with the current stack.

## Default behavior
- Inspect relevant files before editing.
- Prefer the smallest correct change over broad rewrites.
- Preserve the existing architecture unless a larger change is clearly justified.
- Keep explanations short and implementation-focused.
- Be explicit when something is uncertain.

## Documentation rule
Use the Context7 MCP server whenever the task may depend on current documentation, version-specific behavior, or recommended patterns.

Check Context7 proactively for:
- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase
- Vercel
- Node.js
- SDKs, APIs, or packages that change often

Do not rely only on memory when the answer may have changed.

## Implementation rules
- Follow existing project conventions for naming, structure, and style.
- Do not add dependencies unless clearly necessary.
- Do not introduce new abstractions without a concrete reason.
- Prefer readable, production-safe code over clever code.
- Avoid speculative multi-file refactors unless requested.

## Language and text rules
- All user-facing Portuguese text must be written in PT-BR with correct accentuation.
- Keep all edited text files in UTF-8.
- When adding or changing labels, messages, headings, metadata, placeholders, or CTAs in Portuguese, review accentuation and encoding before finishing.
- Treat mojibake or missing accent marks in user-facing copy as defects to be fixed.
- After editing any file with PT-BR text, inspect the final file content and confirm it did not introduce sequences like `Ã`, `Â` or `�` in visible text.
- Avoid file-editing flows that can silently rewrite text with the wrong encoding.

## Next.js rules
- Treat Next.js as version-sensitive.
- If the project uses App Router, stay aligned with App Router patterns.
- Respect server/client boundaries.
- Do not use proxy/middleware for arbitrary app logic.
- Check Context7 before changing routing, data fetching, caching, auth flow, proxy/middleware, or config behavior.

## Supabase rules
- Keep service-role keys server-side only.
- Be careful with auth, SSR, cookies, RLS, and route handlers.
- Check Context7 before changing auth or SSR patterns.
- Prefer additive and safe schema changes unless destructive changes are explicitly requested.

## UI rules
- Preserve current design language unless redesign is requested.
- Improve layout, spacing, hierarchy, and responsiveness without changing functionality.
- Treat mobile stability as required when working on UI.

## Editing workflow
1. Understand the request.
2. Inspect the affected files.
3. Check Context7 if documentation may matter.
4. Apply the smallest safe change.
5. Verify consistency with the current stack.

## Communication
- Be concise.
- State what changed.
- Mention important risks or follow-up checks only when useful.
- Do not pretend something is confirmed if it is not.
