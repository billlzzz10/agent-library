## 2026-07-01 - IPv4-Mapped IPv6 Normalization Evasion
**Vulnerability:** SSRF Protection Bypass via IPv4-Mapped IPv6 addresses.
**Learning:** The Node.js `URL` parser (v22) normalizes dotted-decimal IPv4-mapped IPv6 addresses (e.g., `::ffff:127.0.0.1`) into a hex-shortened format (e.g., `[::ffff:7f00:1]`). A security check that only looks for dotted-decimal suffixes in `::ffff:` ranges will fail to detect these normalized addresses.
**Prevention:** SSRF validation logic must handle both the dotted-decimal and hex-normalized forms of IPv4-mapped IPv6 addresses, or convert them back to a canonical IPv4 form for consistent range checking.
