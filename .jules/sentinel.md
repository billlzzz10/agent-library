## 2025-05-14 - IPv4-mapped IPv6 normalization in SSRF protection
**Vulnerability:** Server-Side Request Forgery (SSRF) via IPv4-mapped IPv6 addresses (e.g., `::ffff:127.0.0.1`).
**Learning:** In the project's environment (Node v22), `new URL()` normalizes IPv4-mapped IPv6 addresses to a hex-shortened form (e.g., `[::ffff:7f00:1]`). A simple string check for `::ffff:127.` or similar will fail to detect these.
**Prevention:** SSRF protection logic must account for normalized hex formats of IPv4-mapped IPv6 addresses by parsing the hex segments into decimal octets for validation.
