## 2026-05-17 - [SSRF Protection with IPv6 Handling]
**Vulnerability:** Server-Side Request Forgery (SSRF) in media generation endpoint.
**Learning:** Standard JavaScript `URL` API hostname property includes brackets for IPv6 addresses (e.g., `[::1]`), which must be accounted for in string comparisons and validation logic.
**Prevention:** Always verify hostname normalization behavior of the URL parser being used and ensure comprehensive validation of user-provided URLs before server-side fetching.
