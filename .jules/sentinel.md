
## 2026-05-20 - Enhanced SSRF Protection for Media Generation
**Vulnerability:** Server-Side Request Forgery (SSRF) via user-provided `inputImageUrl` in media generation plugins.
**Learning:** Plugins performing server-side fetches must validate URLs against private/internal IP ranges. Centralized `isPrivateUrl` utilities should be comprehensive, covering CGNAT (100.64.0.0/10), benchmarking (198.18.0.0/15), and multiple loopback representations (`0.0.0.0`, `::`, `[::]`).
**Prevention:** Always use a hardened `isPrivateUrl` check before any server-side fetch of user-provided URLs.
