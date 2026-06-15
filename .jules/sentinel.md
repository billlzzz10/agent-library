## 2025-05-15 - Centralized SSRF Protection and Media Generation Fix
**Vulnerability:** Server-Side Request Forgery (SSRF) in media generation endpoint.
**Learning:** User-provided URLs for server-side fetching (like `inputImageUrl`) must be validated before use. Node.js `new URL()` helps normalize hostnames (handling hex/octal/decimal IPs), but explicit checks against private/internal IP ranges and hostnames are necessary to prevent access to internal services.
**Prevention:** Always validate user-provided URLs using the centralized `isPrivateUrl` utility from `@/lib/security` before any server-side fetch or redirection.
