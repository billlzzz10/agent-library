## 2026-04-16 - [XSS via JSON-LD Structured Data]

**Vulnerability:** JSON-LD structured data serialized with `JSON.stringify` directly into `<script>` tags can be exploited for XSS if user-controlled input contains unescaped `<` characters.
**Learning:** `JSON.stringify` alone does not escape HTML characters. Malicious user input (e.g. in prompt descriptions) could cause early script termination (e.g. `</script><script>alert(1)</script>`).
**Prevention:** Use the `safeJsonLd` utility function which serializes the data and escapes `<` characters as `\u003c` to safely prevent script tag termination.

## 2026-04-16 - [GitHub Actions Secrets in PRs]

**Vulnerability:** GitHub Actions workflows that depend on secrets (like `ADD_TO_PROJECT_PAT`) can fail with "Bad credentials" if run from forks, where secrets are not exposed to the runner.
**Learning:** Hard failures in workflows due to missing secrets create noisy CI environments and can potentially leak the absence of specific tokens.
**Prevention:** Always check for the existence of required secrets in the job's `if` condition (e.g., `if: secrets.ADD_TO_PROJECT_PAT != ''`) before executing steps that require them.

## 2026-04-17 - [SSRF Bypass via Hex IPv4-mapped IPv6 Addresses]

**Vulnerability:** Under Node v22, `new URL()` automatically normalizes dotted IPv4-mapped IPv6 addresses (such as `[::ffff:127.0.0.1]`) to hex-shortened format (such as `[::ffff:7f00:1]`). This hex representation can bypass standard IPv4/IPv6 private range checks that only look for dotted decimals or specific prefixes.
**Learning:** Standard address parsing utilities like `net.isIP` are insufficient for checking safety of IP addresses without stripping brackets `[` and `]` and fully resolving both decimal and hexadecimal IPv4-mapped IPv6 formats.
**Prevention:** Always strip trailing dots and brackets from hostnames, and manually extract and decode any hexadecimal segments inside `::ffff:` IPv6 prefixes into decimal octets before matching against forbidden IP ranges.
