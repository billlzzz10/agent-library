# Sentinel Journal

## 2025-05-15 - [SSRF Protection]
**Vulnerability:** Potential Server-Side Request Forgery (SSRF) in the media generation API through the `inputImageUrl` parameter.
**Learning:** External API plugins (like Wiro or Fal) often require the server to fetch a user-provided image URL to send it as a blob/multipart data. If not validated, an attacker can use this to probe internal networks or access internal metadata services (like AWS/GCP metadata endpoints).
**Prevention:** Always validate user-provided URLs using the centralized `isPrivateUrl` utility before any server-side fetch. The utility should block not only standard private ranges (10.x, 192.168.x) but also CGNAT, link-local, documentation ranges, and their IPv6 equivalents including IPv4-mapped IPv6.
