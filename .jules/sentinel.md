## 2025-05-14 - Centralized SSRF Protection
**Vulnerability:** Server-Side Request Forgery (SSRF) in media generation API.
**Learning:** Initial SSRF protection was localized within the webhook module. Other features (like media generation) that fetch user-provided URLs were left unprotected. Centralizing this check in `@/lib/security` and applying it at the API route level ensures consistent protection across the entire application.
**Prevention:** Always validate user-provided URLs using `isPrivateUrl` from `@/lib/security` before performing any server-side fetch.
