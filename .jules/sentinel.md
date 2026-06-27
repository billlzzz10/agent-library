# Sentinel Security Journal

## 2025-05-15 - Media Generation SSRF Vulnerability
**Vulnerability:** The `media-generate` API route accepted an `inputImageUrl` parameter from users which was then fetched by the server (specifically in the Wiro.ai plugin) without any validation. This created a Server-Side Request Forgery (SSRF) risk.
**Learning:** Even when using external plugins or APIs, any user-provided URL that causes the server to make an outbound request must be strictly validated. The application already had a partial SSRF check for webhooks, but it was not centralized or comprehensive enough to cover all use cases.
**Prevention:** Use a centralized, robust SSRF protection utility like `isPrivateUrl` for ALL user-provided URLs that the server might fetch. This utility should block loopback, private, reserved, and internal network ranges for both IPv4 and IPv6.
