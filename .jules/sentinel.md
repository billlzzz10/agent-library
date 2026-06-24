# Sentinel Security Journal

## 2025-05-14 - SSRF in Media Generation via Image-to-Image
**Vulnerability:** The `media-generate` endpoint allowed users to provide an `inputImageUrl` for image-to-image or image-to-video tasks. This URL was fetched by the server to be passed to external providers (like Wiro.ai), potentially allowing an attacker to probe internal networks or access metadata services (e.g., AWS/GCP metadata endpoints).
**Learning:** External plugin integrations often introduce new data flows that bypass existing centralized security checks if those checks are only applied to the primary "user content" paths.
**Prevention:** Always validate all user-provided URLs using a centralized security utility (`isPrivateUrl`) before any server-side fetch or hand-off to external APIs.
