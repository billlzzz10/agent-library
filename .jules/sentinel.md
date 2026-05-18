# Sentinel Security Journal

## 2025-05-14 - Enhanced SSRF Protection for Webhooks
**Vulnerability:** Insufficient SSRF protection in webhook URL validation. Missing CGNAT (100.64.0.0/10) and benchmarking (198.18.0.0/15) ranges, as well as the unspecified IPv6 address (::).
**Learning:** Standard private ranges (RFC1918) are often not enough to cover all internal network variations in modern cloud/ISP environments.
**Prevention:** Always include CGNAT, benchmarking, and unspecified addresses in SSRF blacklists.
