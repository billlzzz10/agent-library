# Sentinel Security Journal

## 2025-05-15 - Centralized SSRF Protection and Media Generation Vulnerability
**Vulnerability:** The `media-generate` API endpoint allowed users to provide an `inputImageUrl` which was fetched by the server without validation, leading to potential Server-Side Request Forgery (SSRF). Additionally, existing SSRF protection in the webhook system was localized and less comprehensive.

**Learning:** Decentralized security logic leads to inconsistent protection across different features. The initial `isPrivateUrl` in `webhook.ts` missed several reserved IP ranges (CGNAT, benchmarking) and did not strictly enforce protocols or handle hostname normalization consistently.

**Prevention:** Centralize security-critical logic in `@/lib/security`. Always validate user-provided URLs at the API entry point before any server-side fetching. Use a comprehensive blocklist that includes all reserved IPv4 and IPv6 ranges, enforces strict protocols (HTTP/HTTPS), and normalizes hostnames to prevent common bypasses like trailing dots.
