# 🛡️ Sentinel Security Journal

This journal tracks critical security findings, learnings, and prevention strategies for this repository.

## 2025-05-15 - Centralized SSRF Protection
**Vulnerability:** Server-Side Request Forgery (SSRF) via user-provided URLs.
**Learning:** Initial SSRF protection was scattered and only partially covered loopback and private IPv4 ranges. It missed many edge cases like IPv4-mapped IPv6 addresses (e.g., `[::ffff:127.0.0.1]`), carrier-grade NAT (`100.64.0.0/10`), and benchmarking ranges (`198.18.0.0/15`).
**Prevention:** Always use the centralized `isPrivateUrl` utility from `@/lib/security` for any server-side fetch calls that use user-provided URLs. The utility leverages Node.js `URL` constructor for hostname normalization and handles both IPv4 and IPv6 private/reserved ranges.
