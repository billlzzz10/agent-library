## 2025-05-15 - Centralized SSRF Protection
**Vulnerability:** Server-Side Request Forgery (SSRF) in media generation and potential future features.
**Learning:** The application had a basic `isPrivateUrl` check in the webhook module, but it was missing from the media generation API which also fetches user-provided URLs. The original check also missed some private ranges like CGNAT and benchmarking, and was too specific with IPv6 ULA.
**Prevention:** Always centralize security-critical validation logic like SSRF protection. Any endpoint that performs server-side fetches of user-provided URLs MUST validate those URLs using a robust, centralized utility like `isPrivateUrl` from `@/lib/security`.
