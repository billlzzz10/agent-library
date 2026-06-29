## 2025-05-14 - SSRF in Media Generation API

**Vulnerability:** The `/api/media-generate` endpoint allowed users to provide an `inputImageUrl`. Certain media generator plugins (e.g., Wiro.ai) would fetch this URL server-side to send it to the provider's API. Without validation, this could be used to probe internal networks or access internal services (SSRF).

**Learning:** Centralized security utilities are better than per-module implementations. The existing `isPrivateUrl` in `src/lib/webhook.ts` was less comprehensive and not reused. Centralizing it in `src/lib/security` allowed for a more robust implementation that handles IPv6, CGNAT, and internal TLDs while being easily reusable across the codebase.

**Prevention:** Always validate user-provided URLs that will be fetched by the server. Use a centralized, thoroughly tested security utility for this validation. Add unit tests covering various bypass techniques (e.g., trailing dots, IPv6 variations) to the security utility.
