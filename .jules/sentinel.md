## 2025-05-15 - SSRF Protection in Media Generation
**Vulnerability:** User-provided `inputImageUrl` in media generation API was fetched server-side by the Wiro plugin without validation, allowing for Server-Side Request Forgery (SSRF) against internal networks.
**Learning:** Plugins or utilities that perform server-side fetches based on user input must be protected at the entry point (API route) using centralized validation.
**Prevention:** Use `isPrivateUrl` from `@/lib/security` to validate all user-provided URLs before they are processed or passed to external-facing plugins.
