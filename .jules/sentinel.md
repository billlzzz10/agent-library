# Sentinel Security Journal

## 2025-05-14 - Centralized SSRF Protection
**Vulnerability:** Server-Side Request Forgery (SSRF) in media generation endpoint. The `src/app/api/media-generate/route.ts` accepted an `inputImageUrl` and fetched it on the server (via `wiro` plugin) without validating if it pointed to internal/private infrastructure.
**Learning:** In Next.js applications with various external integrations (webhooks, media plugins), user-provided URLs are a common entry point for SSRF. Distributed validation logic (like the one originally in `webhook.ts`) can be inconsistent and easily missed when adding new features. Also, `new URL().hostname` in this environment returns IPv6 addresses WITH brackets (e.g., `[::1]`), so validation logic must account for this.
**Prevention:** Use a centralized security utility (`src/lib/security/index.ts`) for all URL validation. The `isPrivateUrl` function should be used immediately after request parsing for any user-provided URL that will be fetched by the server. Always check for both IPv4 and IPv6 private ranges, non-HTTP protocols, and internal hostnames.
