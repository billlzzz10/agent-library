# Sentinel Journal - Critical Security Learnings

## 2025-05-14 - Centralized SSRF Protection for User-Provided URLs
**Vulnerability:** User-provided URLs in features like Webhooks and Media Generation (e.g., `inputImageUrl`) could be used to target internal services, metadata endpoints, or private network resources (SSRF).
**Learning:** Initial SSRF protection was fragmented and only covered a subset of private IPv4 ranges. Features that perform server-side fetches based on user input (like image generation plugins) were missing validation entirely.
**Prevention:** Use a centralized `isPrivateUrl` utility from `@/lib/security` that implements a comprehensive blocklist for all reserved, private, and internal address spaces (IPv4 and IPv6), and strictly enforces allowed protocols (HTTP/HTTPS).
