## 2026-05-29 - SSRF Protection Enhancement
**Vulnerability:** Potential SSRF in media generation via user-provided `inputImageUrl`.
**Learning:** Found that centralized `isPrivateUrl` was missing some reserved IP ranges (CGNAT, Benchmarking) and didn't explicitly block `0.0.0.0` or IPv6 unspecified `::`.
**Prevention:** Always use a centralized validation utility for user-provided URLs before server-side fetching, and maintain a robust blacklist of internal/private network ranges.
