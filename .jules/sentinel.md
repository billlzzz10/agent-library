# Sentinel Security Journal 🛡️

## 2025-05-15 - Consolidating SSRF Protection
**Vulnerability:** Scattered and incomplete SSRF protection. The `media-generate` endpoint allowed user-provided URLs to be fetched server-side without validation, while the webhook logic had its own version of `isPrivateUrl`.
**Learning:** Security utilities should be centralized to ensure consistency and easier maintenance. When processing user-provided URLs for server-side fetches (like image processing or webhooks), they must be validated against private/internal network ranges.
**Prevention:** Use a centralized `isPrivateUrl` utility in `@/lib/security` for all user-provided URLs that the server might fetch. Ensure the utility covers comprehensive IP ranges and normalizes hostnames (e.g., handling trailing dots).
