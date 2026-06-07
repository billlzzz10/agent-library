## 2025-05-15 - SSRF Protection via Centralized URL Validation
**Vulnerability:** Server-Side Request Forgery (SSRF) in media generation API. The `inputImageUrl` parameter was used in a `fetch()` call without validation, allowing attackers to probe internal network services.
**Learning:** Security utilities like `isPrivateUrl` should be centralized in `@/lib/security` rather than buried in feature-specific files like `webhook.ts` to ensure visibility and reuse across the entire codebase.
**Prevention:** Always validate user-provided URLs against internal/private IP ranges before performing any server-side fetch. Use a comprehensive validation list that includes RFC1918, CGNAT, loopback (IPv4/IPv6), and internal hostnames (.local, .internal).
