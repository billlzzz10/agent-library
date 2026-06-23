# Sentinel Security Journal

## 2025-05-14 - Centralized SSRF Protection Utility
**Vulnerability:** Potential SSRF in `src/app/api/media-generate/route.ts` via `inputImageUrl` and inconsistent SSRF protection in `src/lib/webhook.ts`.
**Learning:** Initial SSRF protection was fragmented and incomplete (missing CGNAT, benchmarking ranges, and robust IPv6 handling). The built-in `URL` parser normalizes hostnames (e.g., stripping trailing dots and decoding decimal IPs), which simplifies validation logic if used correctly.
**Prevention:** Use the centralized `isPrivateUrl` utility in `src/lib/security/index.ts` for all features that perform server-side fetching of user-provided URLs. Always validate URLs immediately after parsing and before any external request is made.
