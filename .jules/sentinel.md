## 2025-05-14 - SSRF in Media Generation API

**Vulnerability:** The media generation API (`/api/media-generate`) allowed users to provide an `inputImageUrl` which was subsequently fetched server-side by media generator plugins (like Wiro) without validation. This created a Server-Side Request Forgery (SSRF) vulnerability.

**Learning:** While SSRF protection was already implemented for admin webhooks, it was not applied to other user-facing APIs that perform server-side fetches. Security utilities should be centralized to ensure they are easily discoverable and consistently applied across the codebase.

**Prevention:** Always validate user-provided URLs using the centralized `isPrivateUrl` utility from `@/lib/security` before performing any server-side fetch. Defense-in-depth requires checking at the API entry point, even if downstream plugins might have their own checks.
