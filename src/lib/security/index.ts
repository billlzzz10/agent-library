/**
 * Security utilities for protecting the application from common vulnerabilities.
 */

/**
 * Validates that a URL is safe to fetch from the server.
 * Blocks private/internal IP ranges and non-HTTP protocols to prevent SSRF (Server-Side Request Forgery).
 *
 * Blocks:
 * - Non-http/https protocols
 * - Loopback addresses (127.0.0.0/8, ::1)
 * - Private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - Link-local addresses (169.254.0.0/16, fe80::/10)
 * - Carrier-grade NAT (100.64.0.0/10)
 * - Local/internal hostnames (.local, .internal, .localhost)
 * - Multicast and reserved ranges
 */
export function isPrivateUrl(urlString: string | null | undefined): boolean {
  if (!urlString) return false;

  try {
    const url = new URL(urlString);

    // Only allow http and https protocols
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return true;
    }

    let hostname = url.hostname.toLowerCase();

    // Remove trailing dot if present (used for FQDNs)
    if (hostname.endsWith(".")) {
      hostname = hostname.slice(0, -1);
    }

    // Block localhost variations
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "::1" || hostname === "[::1]" || hostname === "::" || hostname === "[::]") {
      return true;
    }

    // Block common internal hostnames
    if (hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname.endsWith(".localhost") || hostname.endsWith(".lan")) {
      return true;
    }

    // Check for IPv4 addresses in private/reserved ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);

    if (match) {
      const [, a, b, c] = match.map(Number);

      // 0.0.0.0/8 - Current network (only 0.0.0.0 is really common but the whole /8 is reserved)
      if (a === 0) return true;

      // 10.0.0.0/8 - Private
      if (a === 10) return true;

      // 100.64.0.0/10 - Shared Address Space (CGNAT)
      if (a === 100 && b >= 64 && b <= 127) return true;

      // 127.0.0.0/8 - Loopback
      if (a === 127) return true;

      // 169.254.0.0/16 - Link-local
      if (a === 169 && b === 254) return true;

      // 172.16.0.0/12 - Private (172.16.0.0 - 172.31.255.255)
      if (a === 172 && b >= 16 && b <= 31) return true;

      // 192.0.0.0/24 - IETF Protocol Assignments
      if (a === 192 && b === 0 && c === 0) return true;

      // 192.0.2.0/24 - Documentation (TEST-NET-1)
      if (a === 192 && b === 0 && c === 2) return true;

      // 192.88.99.0/24 - IPv6 to IPv4 relay (deprecated)
      if (a === 192 && b === 88 && c === 99) return true;

      // 192.168.0.0/16 - Private
      if (a === 192 && b === 168) return true;

      // 198.18.0.0/15 - Benchmarking
      if (a === 198 && b >= 18 && b <= 19) return true;

      // 198.51.100.0/24 - Documentation (TEST-NET-2)
      if (a === 198 && b === 51 && c === 100) return true;

      // 203.0.113.0/24 - Documentation (TEST-NET-3)
      if (a === 203 && b === 0 && c === 113) return true;

      // 224.0.0.0/4 - Multicast
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 - Reserved
      if (a >= 240) return true;
    }

    // Block IPv6 private/reserved ranges
    if (hostname.startsWith("[")) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();
      // ::1 - Loopback
      // fe80::/10 - Link-local
      // fc00::/7 - Unique local (includes fd00::/8)
      // :: - Unspecified
      if (
        ipv6 === "::1" ||
        ipv6 === "::" ||
        ipv6.startsWith("fe8") ||
        ipv6.startsWith("fe9") ||
        ipv6.startsWith("fea") ||
        ipv6.startsWith("feb") ||
        ipv6.startsWith("fc") ||
        ipv6.startsWith("fd")
      ) {
        return true;
      }
    } else if (hostname.includes(":")) {
      // IPv6 without brackets (sometimes handled by URL parser depending on context)
      const ipv6 = hostname.toLowerCase();
      if (
        ipv6 === "::1" ||
        ipv6 === "::" ||
        ipv6.startsWith("fe8") ||
        ipv6.startsWith("fe9") ||
        ipv6.startsWith("fea") ||
        ipv6.startsWith("feb") ||
        ipv6.startsWith("fc") ||
        ipv6.startsWith("fd")
      ) {
        return true;
      }
    }

    return false;
  } catch {
    // Invalid URL - treat as potentially dangerous
    return true;
  }
}
