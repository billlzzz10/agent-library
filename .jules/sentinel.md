## 2025-05-14 - [Centralized SSRF Protection]
**Vulnerability:** Server-Side Request Forgery (SSRF) via user-provided image URLs in media generation and webhook test endpoints.
**Learning:** Node's `new URL()` constructor automatically normalizes various IP formats (decimal, octal, hex) to dotted-decimal, allowing a simple regex check on `url.hostname` to catch many obfuscation attempts.
**Prevention:** Always validate user-provided URLs against a blocklist of private/internal IP ranges and hostnames using a centralized utility like `isPrivateUrl` before making server-side fetches.
