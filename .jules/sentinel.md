## 2025-05-15 - SSRF in Media Generation API
**Vulnerability:** The `media-generate` API endpoint allowed users to provide an `inputImageUrl` which was fetched by the server without validation, leading to potential Server-Side Request Forgery (SSRF).
**Learning:** While SSRF protection was implemented for webhooks, it was not centralized, leading to its omission in newer features like media generation. Reusing the `isPrivateUrl` utility across all server-side fetch operations is crucial.
**Prevention:** Centralize all security-critical validation logic (like SSRF protection) into a shared library (`@/lib/security`) and ensure it's applied to all endpoints that handle user-provided URLs.
