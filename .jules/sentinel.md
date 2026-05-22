## 2025-05-14 - Robust SSRF Protection
**Vulnerability:** SSRF via user-provided image URLs in media generators and webhooks.
**Learning:** String-based URL validation is prone to bypasses (alternative IP formats). Using `new URL()` helps normalize some formats, but comprehensive CIDR-based checks on normalized hostnames are more reliable.
**Prevention:** Use a centralized validation function that checks against a comprehensive list of private/reserved IP ranges and hostnames, and always validate external URLs before server-side fetch.