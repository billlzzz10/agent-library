## 2026-04-16 - [XSS via JSON-LD Structured Data]

**Vulnerability:** JSON-LD structured data serialized with `JSON.stringify` directly into `<script>` tags can be exploited for XSS if user-controlled input contains unescaped `<` characters.
**Learning:** `JSON.stringify` alone does not escape HTML characters. Malicious user input (e.g. in prompt descriptions) could cause early script termination (e.g. `</script><script>alert(1)</script>`).
**Prevention:** Use the `safeJsonLd` utility function which serializes the data and escapes `<` characters as `\u003c` to safely prevent script tag termination.

## 2026-04-16 - [GitHub Actions Secrets in PRs]

**Vulnerability:** GitHub Actions workflows that depend on secrets (like `ADD_TO_PROJECT_PAT`) can fail with "Bad credentials" if run from forks, where secrets are not exposed to the runner.
**Learning:** Hard failures in workflows due to missing secrets create noisy CI environments and can potentially leak the absence of specific tokens.
**Prevention:** Always check for the existence of required secrets in the job's `if` condition (e.g., `if: secrets.ADD_TO_PROJECT_PAT != ''`) before executing steps that require them.

## 2026-07-11 - [SSRF in Media Generation & Webhook DNS Rebinding]

**Vulnerability:** Server-Side Request Forgery (SSRF) allowed access to internal/private resources via user-supplied `inputImageUrl` in the media generation API, and DNS rebinding could bypass webhook domain checks.
**Learning:** Checking hostnames synchronously without resolving them to their IP addresses allows attackers to bypass checks via DNS rebinding. Furthermore, fetching remote user images server-side (such as in Wiro media generator plugin) must be gated by strict SSRF filtering.
**Prevention:** Always normalize the URL hostname (stripping brackets and trailing dots), resolve hostnames asynchronously to check resolved IPs against comprehensive private IP ranges (including carrier-grade NAT, benchmark, and test-net ranges), and use asynchronous `validateUrl` before any server-side fetching.
