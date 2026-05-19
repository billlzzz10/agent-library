## 2026-05-19 - [SSRF Protection in Media Generators]
**Vulnerability:** Server-Side Request Forgery (SSRF) via input image URLs in media generation plugins.
**Learning:** External providers like Wiro may require fetching user-provided images server-side to forward them to their API. Without validation, this allows attackers to probe internal networks or access metadata services (IMDS).
**Prevention:** Always validate user-provided URLs against a robust list of private/internal IP ranges (including CGNAT and benchmarking ranges) before performing server-side fetches. Centralize this logic to ensure consistency across the codebase.
