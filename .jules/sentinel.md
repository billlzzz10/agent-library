## 2025-05-27 - Centralized SSRF Protection for Media Generation
**Vulnerability:** Server-Side Request Forgery (SSRF) via `inputImageUrl` in the media generation API. An attacker could provide an internal URL (e.g., `http://localhost:3000/admin`) that the server would then fetch, potentially exposing internal services or data.
**Learning:** Security utilities should be centralized in `src/lib` to ensure they are easily discoverable and consistently applied across the codebase. Defense-in-depth requires validation at both the API entry point and the plugin/service level.
**Prevention:** Always validate user-provided URLs using `isPrivateUrl` before performing server-side fetches. Use centralized security utilities and maintain dedicated security test suites.
