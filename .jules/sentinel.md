## 2025-05-15 - Centralized SSRF Protection
**Vulnerability:** Server-Side Request Forgery (SSRF) was possible via user-provided URLs in media generation (inputImageUrl) and webhook configurations. Validation was previously scattered and inconsistent.
**Learning:** Hostnames parsed by the `URL` constructor may include brackets for IPv6 (e.g., `[::1]`) and normalize trailing dots (e.g., `google.com.` becomes `google.com`). Direct string comparisons must account for these normalizations.
**Prevention:** Utilize the centralized `isPrivateUrl` utility in `@/lib/security` for all user-provided URLs before performing server-side requests. This utility handles IPv4 ranges (RFC 1918, CGNAT, etc.), IPv6, and internal TLDs like `.local` and `.internal`.
## 2026-04-16 - [XSS via JSON-LD Structured Data]

**Vulnerability:** JSON-LD structured data serialized with `JSON.stringify` directly into `<script>` tags can be exploited for XSS if user-controlled input contains unescaped `<` characters.
**Learning:** `JSON.stringify` alone does not escape HTML characters. Malicious user input (e.g. in prompt descriptions) could cause early script termination (e.g. `</script><script>alert(1)</script>`).
**Prevention:** Use the `safeJsonLd` utility function which serializes the data and escapes `<` characters as `\u003c` to safely prevent script tag termination.

## 2026-04-16 - [GitHub Actions Secrets in PRs]

**Vulnerability:** GitHub Actions workflows that depend on secrets (like `ADD_TO_PROJECT_PAT`) can fail with "Bad credentials" if run from forks, where secrets are not exposed to the runner.
**Learning:** Hard failures in workflows due to missing secrets create noisy CI environments and can potentially leak the absence of specific tokens.
**Prevention:** Always check for the existence of required secrets in the job's `if` condition (e.g., `if: secrets.ADD_TO_PROJECT_PAT != ''`) before executing steps that require them.
