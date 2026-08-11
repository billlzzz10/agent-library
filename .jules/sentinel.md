## 2026-08-10 - [IPv6 Bracket Handling in SSRF URL Validation]

**Vulnerability:** Standard Node `new URL().hostname` for IPv6 address literals retains square brackets (e.g., `[::1]`). Passing this uncleaned string to `net.isIP` returns 0, failing validation checks and bypassing pre-DNS-lookup blocks to trigger unvalidated DNS lookups/fetching.
**Learning:** Raw IPv6 literal URLs need brackets stripped before bare IP checks can identify and block local or restricted destinations.
**Prevention:** Always strip leading `[` and trailing `]` brackets from URL hostnames before evaluating them against IP address parsing or categorization functions.

## 2026-04-16 - [XSS via JSON-LD Structured Data]

**Vulnerability:** JSON-LD structured data serialized with `JSON.stringify` directly into `<script>` tags can be exploited for XSS if user-controlled input contains unescaped `<` characters.
**Learning:** `JSON.stringify` alone does not escape HTML characters. Malicious user input (e.g. in prompt descriptions) could cause early script termination (e.g. `</script><script>alert(1)</script>`).
**Prevention:** Use the `safeJsonLd` utility function which serializes the data and escapes `<` characters as `\u003c` to safely prevent script tag termination.

## 2026-04-16 - [GitHub Actions Secrets in PRs]

**Vulnerability:** GitHub Actions workflows that depend on secrets (like `ADD_TO_PROJECT_PAT`) can fail with "Bad credentials" if run from forks, where secrets are not exposed to the runner.
**Learning:** Hard failures in workflows due to missing secrets create noisy CI environments and can potentially leak the absence of specific tokens.
**Prevention:** Always check for the existence of required secrets in the job's `if` condition (e.g., `if: secrets.ADD_TO_PROJECT_PAT != ''`) before executing steps that require them.
