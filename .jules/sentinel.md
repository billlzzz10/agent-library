# Sentinel Security Journal

## 2025-05-15 - SSRF Protection Centralization and Media Generation Fix
**Vulnerability:** Server-Side Request Forgery (SSRF) in media generation and potential for inconsistent protection across the application.
**Learning:** The application allowed users to provide an `inputImageUrl` for media generation which was fetched by the server without validation. Other parts of the app (webhooks) had a local `isPrivateUrl` check which was not reused.
**Prevention:** Centralized SSRF protection in `src/lib/security/index.ts` and applied it consistently. Enhanced the protection to include CGNAT, benchmarking ranges, and strict protocol enforcement. Note: `new URL().hostname` returns brackets for IPv6 in this environment.
