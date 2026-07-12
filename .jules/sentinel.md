## 2025-05-15 - [SSRF Protection]
**Vulnerability:** Server-Side Request Forgery (SSRF) in media generation endpoint.
**Learning:** The `inputImageUrl` parameter allowed users to specify URLs that the server would fetch. Without validation, this could be used to probe internal networks or access sensitive metadata services (e.g., AWS IMDS).
**Prevention:** Centralized URL validation using a robust `isPrivateUrl` utility that blocks private IP ranges, internal hostnames, and non-HTTP(S) schemes.
