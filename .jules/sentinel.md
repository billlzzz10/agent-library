# Sentinel Security Journal

## 2025-05-15 - Centralized SSRF Protection Utility
**Vulnerability:** Scattered and incomplete SSRF protection logic. Previously, only webhooks had basic IP-based filtering, leaving other features like media generation vulnerable when fetching user-provided URLs.
**Learning:** Security logic should be centralized to ensure consistency. A naive IP check is often insufficient; comprehensive protection requires blocking various reserved ranges (CGNAT, benchmarking, etc.) and handling IPv6 correctly.
**Prevention:** Always validate user-provided URLs using the centralized `isPrivateUrl` utility before any server-side fetch. Use a dedicated security module to house these critical checks.
