## Brief overview

Guidelines for working with Azure SDKs and Microsoft AI Foundry services. These rules ensure current, clean, and maintainable code when developing agent skills and Azure integrations.

## Fresh information first

- Always search official Microsoft docs via `microsoft-docs` MCP before implementing Azure/Foundry SDK code
- Verify installed SDK versions with `pip show <package>` — APIs differ between versions
- Never rely on cached knowledge — Azure SDKs change constantly and training data is outdated
- If you skip verification and use outdated patterns, you will produce broken code

## MCP servers

Available MCP servers for development:

- `microsoft-docs` — Search Microsoft Learn official Azure/Foundry docs (use FIRST)
- `context7` — Indexed documentation with semantic search (requires CONTEXT7_API_KEY)
- `markitdown` — Convert documents to markdown
- `next-devtools-mcp` — Next.js development tools
- `neon` — Neon PostgreSQL database operations
- `vercel` — Vercel deployment and project management

## Core development principles

### Think before coding

- State assumptions explicitly; if uncertain, ask
- If multiple interpretations exist, present them — don't pick silently
- If a simpler approach exists, say so; push back when warranted
- If something is unclear, stop and name what's confusing

### Simplicity first

- Write minimum code that solves the problem; nothing speculative
- No features beyond what was asked
- No abstractions for single-use code
- No "flexibility" or "configurability" that wasn't requested
- Test: Would a senior engineer say this is overcomplicated? If yes, simplify

### Surgical changes

- Touch only what you must; clean up only your own mess
- Don't "improve" adjacent code, comments, or formatting
- Don't refactor things that aren't broken
- Match existing style, even if you'd do it differently
- Remove imports/variables/functions that YOUR changes made unused
- Don't remove pre-existing dead code unless asked
- Test: Every changed line should trace directly to the user's request

### Goal-driven execution (TDD)

- Define success criteria before implementation
- Write tests for invalid inputs, then make them pass
- Write a test that reproduces bugs, then fix them
- Ensure tests pass before and after refactoring

## Code style conventions

- Prefer `async/await` for all Azure SDK I/O operations
- Use context managers: `with client:` or `async with client:`
- Close clients explicitly or use context managers
- Use `create_or_update_*` for idempotent operations
- Use type hints on all function signatures
- Use `DefaultAzureCredential` for production authentication

## Clean code checklist

Before completing any code change, verify:
- Functions do one thing

- Names are descriptive and intention-revealing
- No magic numbers or strings (use constants)
- Error handling is explicit (no empty catch blocks)
- No commented-out code
- Tests cover the change

## Do's and don'ts

### Do

- Use `DefaultAzureCredential` for authentication
- Use async/await for all Azure SDK operations
- Write tests before or alongside implementation
- Keep functions small and focused
- Match existing patterns in the codebase

### Don't

- Hardcode credentials or endpoints
- Suppress type errors (`as any`, `@ts-ignore`, `# type: ignore`)
- Leave empty exception handlers
- Refactor unrelated code while fixing bugs
- Add dependencies without justification
