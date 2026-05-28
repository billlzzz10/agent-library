## 2025-05-14 - Centralized SSRF Protection
**Vulnerability:** Server-Side Request Forgery (SSRF) in media generation and potential future features. The `wiro` media generator was fetching user-provided `inputImageUrl` without any validation.
**Learning:** Node's `new URL()` constructor automatically normalizes various IP formats (decimal, hex, octal), which can be leveraged for simpler and more robust SSRF validation compared to complex regex patterns.
**Prevention:** Always validate user-provided URLs against a centralized `isPrivateUrl` utility before performing server-side fetches.
