## 2025-02-13 - Centralized SSRF Protection and Media Generation Fix
**Vulnerability:** User-provided `inputImageUrl` in the media generation API was used by backend plugins (like Wiro) to fetch remote images without validation. This allowed an attacker to perform Server-Side Request Forgery (SSRF) against internal services.
**Learning:** Security utilities like SSRF protection should be centralized and consistently applied to all server-side fetch calls that use user-provided input.
**Prevention:** Always validate user-provided URLs against a list of private/internal IP ranges and hostnames before performing any server-side network requests.
