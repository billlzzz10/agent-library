## 2025-06-06 - Centralized SSRF Protection and Media Generation Fix
**Vulnerability:** Server-Side Request Forgery (SSRF) via user-provided image URLs in media generation and potential bypasses in webhook validation.
**Learning:** Node.js `new URL().hostname` automatically normalizes various IP formats (decimal, hex, octal, shortened) to standard dotted-decimal or IPv6. Validating the hostname AFTER this normalization is a robust way to prevent many SSRF bypass techniques.
**Prevention:** Always use a centralized, well-tested utility like `isPrivateUrl` for any server-side fetch calls that use user-provided input.
