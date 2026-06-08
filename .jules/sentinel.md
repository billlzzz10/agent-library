## 2025-05-14 - Centralized SSRF Protection and Media Generation Fix
**Vulnerability:** Potential Server-Side Request Forgery (SSRF) via user-provided `inputImageUrl` in the media generation API.
**Learning:** Node.js `new URL().hostname` automatically normalizes many alternative IP formats (like hex `0x7f000001` or decimal `2130706433`) to standard dotted-decimal or IPv6 format. This simplifies validation but still requires a robust set of checks for private ranges, link-local, CGNAT, and internal hostnames. Centralizing this logic ensures consistency across webhooks, media generation, and other future outbound request features.
**Prevention:** Always validate user-provided URLs against a centralized `isPrivateUrl` utility before any server-side fetch.
