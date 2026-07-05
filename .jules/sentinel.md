## 2025-05-14 - SSRF vulnerability in media generation and centralized protection logic

**Vulnerability:** Server-Side Request Forgery (SSRF) was possible via the `inputImageUrl` parameter in the `media-generate` API. Additionally, the existing `isPrivateUrl` check in `webhook.ts` was incomplete, lacking coverage for several private IP ranges and protocol enforcement.

**Learning:** Next.js (Node.js) `new URL()` normalizes IPv4-mapped IPv6 addresses to a hex-shortened form (e.g., `[::ffff:7f00:1]` for `127.0.0.1`). Security logic must account for this normalization when performing IP-based filtering. Restricting to specific protocols (e.g., `http:`, `https:`) is a critical first step in SSRF defense to prevent attacks using other schemas like `file:`, `gopher:`, or `ftp:`.

**Prevention:** Use a centralized, strictly validated security utility for all outgoing server-side requests. Ensure the utility handles IP normalization, covers all RFC private ranges (including CGNAT and benchmarking), and enforces protocol allowlists. Use comprehensive unit tests to verify the protection logic against known SSRF bypass techniques.
