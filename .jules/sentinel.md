## 2025-05-15 - SSRF in Media Generation Plugins

**Vulnerability:** Server-Side Request Forgery (SSRF) via user-provided image URLs in the media generation API. The server would fetch user-provided URLs to pass them as binary data to external AI providers (Wiro.ai) without validating if the URL pointed to internal/private networks.

**Learning:** Decentralized security logic (like `isPrivateUrl` being defined inside `webhook.ts`) leads to missing protection in other areas of the codebase. Centralizing these utilities into `src/lib/security` ensures they are reusable and easier to maintain. Additionally, simple IP checks often miss reserved ranges like CGNAT (100.64.0.0/10) or benchmarking ranges (198.18.0.0/15).

**Prevention:** Always centralize security-critical validation logic. Ensure all server-side fetches of user-provided URLs are checked against a comprehensive private network blocklist.
