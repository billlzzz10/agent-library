# Sentinel Security Journal

## 2025-05-15 - SSRF via User-Provided URLs in Media Generation
**Vulnerability:** Server-Side Request Forgery (SSRF) allowed attackers to make the server fetch images from internal/private network addresses (e.g., localhost, internal services) via the `inputImageUrl` parameter.
**Learning:** Features that fetch external resources based on user input are common entry points for SSRF. While some parts of the app (webhooks) had protection, new features (media generation) lacked it.
**Prevention:** Always validate user-provided URLs against a blocklist of private/internal IP ranges using a centralized utility (`isPrivateUrl`) before performing any server-side fetch.
