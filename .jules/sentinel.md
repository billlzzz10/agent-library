## 2025-05-15 - [SSRF Protection & URL Normalization]
**Vulnerability:** Server-Side Request Forgery (SSRF) in media generation and webhooks.
**Learning:**
1. **Trailing Dot Bypass:** Hostnames ending in a dot (e.g., `127.0.0.1.`) can bypass simple string matching or regex filters if not explicitly stripped, even though they resolve to the same IP.
2. **IPv6 Normalization:** In Node.js (v22+), `new URL()` normalizes some IPv4-mapped IPv6 addresses to hex format (e.g., `::ffff:127.0.0.1` becomes `[::ffff:7f00:1]`). Security filters must handle both decimal and hex formats within the `::ffff:` prefix.
3. **Protocol Restriction:** SSRF protection must enforce `http:` or `https:` to prevent attacks using other URI schemes like `file:`, `gopher:`, or `ftp:`.
**Prevention:** Use a robust `isPrivateUrl` utility that strips trailing dots, enforces protocols, and checks both IPv4 and IPv6 (including mapped/normalized formats) against all IANA-reserved ranges.
