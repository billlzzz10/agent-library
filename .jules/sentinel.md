## 2026-04-16 - [XSS via JSON-LD Structured Data]

**Vulnerability:** JSON-LD structured data serialized with `JSON.stringify` directly into `<script>` tags can be exploited for XSS if user-controlled input contains unescaped `<` characters.
**Learning:** `JSON.stringify` alone does not escape HTML characters. Malicious user input (e.g. in prompt descriptions) could cause early script termination (e.g. `</script><script>alert(1)</script>`).
**Prevention:** Use the `safeJsonLd` utility function which serializes the data and escapes `<` characters as `\u003c` to safely prevent script tag termination.

## 2026-04-16 - [GitHub Actions Secrets in PRs]

**Vulnerability:** GitHub Actions workflows that depend on secrets (like `ADD_TO_PROJECT_PAT`) can fail with "Bad credentials" if run from forks, where secrets are not exposed to the runner.
**Learning:** Hard failures in workflows due to missing secrets create noisy CI environments and can potentially leak the absence of specific tokens.
**Prevention:** Always check for the existence of required secrets in the job's `if` condition (e.g., `if: secrets.ADD_TO_PROJECT_PAT != ''`) before executing steps that require them.

## 2026-05-18 - [SSRF via External Media Input Image URLs]

**Vulnerability:** Media generation endpoint POST `/api/media-generate` accepted an arbitrary `inputImageUrl` parameter which was fetched on the server side by plugins (e.g. `wiro.ts`) without prior security validation.
**Learning:** Delegating outbound HTTP fetch operations to system plugins without validating URL inputs on API-entry boundary exposes the system to Server-Side Request Forgery (SSRF).
**Prevention:** Always use the centralized `validateUrl` security utility to validate untrusted URLs on the API routing layer before passing them down to service/plugin layers or initiating fetch requests.
