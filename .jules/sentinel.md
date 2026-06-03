## 2025-05-14 - Fix SSRF in Media Generation

**Vulnerability:** Server-Side Request Forgery (SSRF) in the media generation endpoint. The `wiro.ts` plugin would `fetch` user-provided `inputImageUrl` without any validation against internal network ranges.

**Learning:** While some parts of the system (webhooks) had SSRF protection, it was implemented as a local utility and not shared. New features that perform server-side requests (like media generation) were implemented without realizing the need for this protection.

**Prevention:** Centralized security utilities into `@/lib/security`. Established a directive that all server-side fetch calls using user-provided URLs must be validated against `isPrivateUrl`. Added comprehensive unit tests for the centralized utility to prevent regressions.
