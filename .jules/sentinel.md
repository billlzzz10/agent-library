## 2025-05-14 - Fix SSRF in media generation API
**Vulnerability:** User-provided `inputImageUrl` in the media generation API was fetched by the server without validation, allowing Server-Side Request Forgery (SSRF) against internal services.
**Learning:** Even if a utility like `isPrivateUrl` exists in the codebase, it might be scoped to a specific module (e.g., webhooks) and missed during the development of new features that perform server-side fetches.
**Prevention:** Centralize security utilities like SSRF protection in a dedicated security module (`src/lib/security`) and ensure all APIs that accept external URLs use them.
