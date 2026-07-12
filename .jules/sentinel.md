## 2025-05-15 - Centralized SSRF Protection
**Vulnerability:** Server-Side Request Forgery (SSRF) was possible via user-provided URLs in media generation (inputImageUrl) and webhook configurations. Validation was previously scattered and inconsistent.
**Learning:** Hostnames parsed by the `URL` constructor may include brackets for IPv6 (e.g., `[::1]`) and normalize trailing dots (e.g., `google.com.` becomes `google.com`). Direct string comparisons must account for these normalizations.
**Prevention:** Utilize the centralized `isPrivateUrl` utility in `@/lib/security` for all user-provided URLs before performing server-side requests. This utility handles IPv4 ranges (RFC 1918, CGNAT, etc.), IPv6, and internal TLDs like `.local` and `.internal`.
