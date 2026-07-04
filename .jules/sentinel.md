# Sentinel Journal - Security Learnings

## 2025-05-14 - Robust SSRF Protection with Node.js URL Parsing
**Vulnerability:** Server-Side Request Forgery (SSRF) through user-provided URLs that are subsequently fetched by the server (e.g., `inputImageUrl` in media generation).
**Learning:** Standard URL parsers in Node.js (like `new URL()`) normalize IPv4-mapped IPv6 addresses (e.g., `::ffff:127.0.0.1` becomes `[::ffff:7f00:1]`). Security logic must account for this normalization when validating IP ranges. Additionally, protocol enforcement (allowing only `http:` and `https:`) is a critical first line of defense against other URI schemes like `file:` or `gopher:`.
**Prevention:** Use a centralized, well-tested security utility (`isPrivateUrl`) that handles IP range validation (including IPv4, IPv6, and mapped addresses), hostname normalization, and strict protocol enforcement. Always validate user-provided URLs at the entry point (API route) before they reach internal fetchers or plugins.
