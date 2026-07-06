# Sentinel Security Journal

🛡️ Guardians of the codebase.

## 2025-05-22 - SSRF in Media Generation and Webhook Flows
**Vulnerability:** Server-Side Request Forgery (SSRF) via unvalidated external URLs. The `inputImageUrl` in the media generation API and `url` in webhook configurations were used to fetch data from the server without sufficient validation, potentially allowing access to internal services.

**Learning:** While some protection existed in the webhook module, it was not comprehensive and not accessible to other parts of the application. Centralizing security utilities is crucial for defense in depth. Node's `new URL()` also has specific normalization behaviors (like wrapping IPv6 in brackets) that must be accounted for in IP-based filtering.

**Prevention:** Always validate external URLs using a centralized, robust utility like `isPrivateUrl`. This utility should enforce allowed protocols (http/https), normalize hostnames (strip trailing dots), and block all private/reserved IPv4 and IPv6 ranges, including IPv4-mapped IPv6 addresses.
