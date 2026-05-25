## 2026-05-25 - [SSRF Protection Centralization]
**Vulnerability:** Server-Side Request Forgery (SSRF) in media generator plugins and inconsistent validation in webhooks.
**Learning:** Using `new URL().hostname` in Node.js is a powerful way to normalize various IP formats (decimal, octal, hex) before applying regex-based validation.
**Prevention:** Always use a centralized, well-tested `isPrivateUrl` utility before performing server-side fetches on user-provided URLs.
