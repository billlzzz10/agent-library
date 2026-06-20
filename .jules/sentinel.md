# Sentinel Security Journal

## 2025-05-22 - [Centralized SSRF Protection]
**Vulnerability:** Potential Server-Side Request Forgery (SSRF) in media generation API.
**Learning:** The application allows users to provide an `inputImageUrl` for media generation. This URL was fetched server-side by plugins (e.g., Wiro) without prior validation, potentially allowing attackers to access internal network resources or scan ports.
**Prevention:** Centralize SSRF protection logic in `@/lib/security` and validate all user-provided URLs at the API entry point before passing them to internal services or plugins. Use a comprehensive IP range blocklist (Loopback, Private, CGNAT, etc.).
