## 2025-05-14 - SSRF in Media Generation

**Vulnerability:** Server-Side Request Forgery (SSRF) in `wiro` media generator plugin. The plugin was fetching user-provided `inputImageUrl` without validation, allowing an attacker to probe internal networks or access internal services.

**Learning:** Decentralized security checks lead to gaps. While webhooks had SSRF protection, other plugins performing similar fetch operations did not.

**Prevention:** Centralize security-critical logic like SSRF protection into shared utilities and ensure all fetch operations on user-provided URLs use them.
