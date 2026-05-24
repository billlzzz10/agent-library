## 2025-05-24 - Centralized SSRF Protection
**Vulnerability:** Server-Side Request Forgery (SSRF) in media generator plugins.
**Learning:** User-provided URLs (like `inputImageUrl`) used in server-side `fetch` calls were not validated, allowing potential access to internal network services.
**Prevention:** Always validate user-provided URLs against a centralized `isPrivateUrl` utility that blocks loopback, private ranges (RFC1918), CGNAT, and other reserved IP ranges before performing server-side requests.
