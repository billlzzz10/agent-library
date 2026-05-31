## 2026-05-31 - SSRF in Media Generation API
**Vulnerability:** Server-Side Request Forgery (SSRF) via user-provided `inputImageUrl` in the media generation endpoint.
**Learning:** Utility functions for security (like `isPrivateUrl`) should be centralized in `@/lib/security` to ensure they are consistently applied across the codebase. The media generation flow was previously overlooked because the SSRF check was buried in the webhook logic.
**Prevention:** Audit all `fetch` calls that use user-provided URLs and wrap them with `isPrivateUrl` validation.
