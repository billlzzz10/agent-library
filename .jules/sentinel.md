# Sentinel's Journal - Critical Security Learnings

## 2025-05-15 - SSRF Vulnerability in Media Generator
**Vulnerability:** Server-Side Request Forgery (SSRF) in `wiroGeneratorPlugin` via the `inputImageUrl` parameter.
**Learning:** Plugins that perform server-side fetching of user-provided URLs are high-risk areas for SSRF. The `wiro` plugin was fetching `inputImageUrl` without any validation, allowing potential access to internal network resources.
**Prevention:** Always validate user-provided URLs against a blocklist of private/internal IP ranges and hostnames before performing server-side fetches. Reuse centralized validation utilities like `isPrivateUrl`.
