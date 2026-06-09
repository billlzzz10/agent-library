# Sentinel Security Journal

## 2026-06-09 - Refactored SSRF Protection and Fixed Media Generation Vulnerability
**Vulnerability:** Server-Side Request Forgery (SSRF) in media generation API. The `inputImageUrl` parameter was used in a server-side `fetch` without validation, allowing internal network probing.
**Learning:** Security utilities like `isPrivateUrl` should be centralized in `@/lib/security` rather than buried in feature-specific files like `webhook.ts` to encourage reuse across the codebase.
**Prevention:** Always validate user-provided URLs against internal IP ranges before performing server-side fetches. Maintain a centralized, tested security utility for this purpose.
