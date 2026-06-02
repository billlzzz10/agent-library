## 2025-06-02 - SSRF Protection in Media Generation
**Vulnerability:** Server-Side Request Forgery (SSRF) through user-provided `inputImageUrl` in the media generation API. The backend would fetch any URL provided by the user, potentially exposing internal services or cloud metadata.
**Learning:** Even when using third-party generator plugins, if the local server performs an intermediate fetch (as seen in `wiro.ts`), SSRF validation must be applied at the entry point. Centralizing this logic ensures consistency across webhooks and media generation.
**Prevention:** Always validate user-provided URLs against a robust list of private/internal IP ranges and hostnames using a normalized URL object. Use the native `URL` constructor to handle various obfuscation techniques.
