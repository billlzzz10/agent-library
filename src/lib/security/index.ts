/**
 * Security utilities for the application.
 */

/**
 * Validates that a URL is safe to fetch from the server.
 * Blocks:
 * - Non-HTTP/HTTPS protocols
 * - Private IPv4 ranges (RFC 1918, CGNAT, Loopback, Link-local)
 * - Private/Reserved IPv6 ranges
 * - Localhost and internal hostnames
 *
 * @param urlString The URL to validate
 * @returns true if the URL is private/internal or otherwise unsafe
 */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Only allow http: and https: protocols
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return true;
    }

    let hostname = url.hostname.toLowerCase();

    // Normalize hostname: strip trailing dot if present
    if (hostname.endsWith('.')) {
      hostname = hostname.slice(0, -1);
    }

    // Block localhost variations
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1") {
      return true;
    }

    // Block common internal hostnames
    if (
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".lan")
    ) {
      return true;
    }

    // Check for IPv4 addresses in private/reserved ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);

    if (match) {
      const [, a, b, c, d] = match.map(Number);

      // Validate octets are within 0-255
      if ([a, b, c, d].some(octet => octet > 255)) return true;

      // 0.0.0.0/8 - Current network
      if (a === 0) return true;

      // 10.0.0.0/8 - Private (RFC 1918)
      if (a === 10) return true;

      // 100.64.0.0/10 - Shared Address Space (CGNAT)
      if (a === 100 && b >= 64 && b <= 127) return true;

      // 127.0.0.0/8 - Loopback
      if (a === 127) return true;

      // 169.254.0.0/16 - Link-local
      if (a === 169 && b === 254) return true;

      // 172.16.0.0/12 - Private (RFC 1918)
      if (a === 172 && b >= 16 && b <= 31) return true;

      // 192.0.0.0/24 - IETF Protocol Assignments
      if (a === 192 && b === 0 && c === 0) return true;

      // 192.0.2.0/24 - TEST-NET-1 (Documentation)
      if (a === 192 && b === 0 && c === 2) return true;

      // 192.88.99.0/24 - IPv6 to IPv4 relay
      if (a === 192 && b === 88 && c === 99) return true;

      // 192.168.0.0/16 - Private (RFC 1918)
      if (a === 192 && b === 168) return true;

      // 198.18.0.0/15 - Network benchmark
      if (a === 198 && b >= 18 && b <= 19) return true;

      // 198.51.100.0/24 - TEST-NET-2 (Documentation)
      if (a === 198 && b === 51 && c === 100) return true;

      // 203.0.113.0/24 - TEST-NET-3 (Documentation)
      if (a === 203 && b === 0 && c === 113) return true;

      // 224.0.0.0/4 - Multicast
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 - Reserved
      if (a >= 240) return true;

      // 255.255.255.255/32 - Broadcast
      if (a === 255 && b === 255 && c === 255 && d === 255) return true;
    }

    // Check for IPv6 addresses
    if (hostname.startsWith("[") && hostname.endsWith("]")) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();

      // Loopback (::1)
      if (ipv6 === "::1" || ipv6 === "0:0:0:0:0:0:0:1") return true;

      // Link-local (fe80::/10)
      if (ipv6.startsWith("fe80:")) return true;

      // Unique local (fc00::/7)
      if (ipv6.startsWith("fc") || ipv6.startsWith("fd")) return true;

      // Multicast (ff00::/8)
      if (ipv6.startsWith("ff")) return true;

      // Documentation (2001:db8::/32)
      if (ipv6.startsWith("2001:db8:")) return true;

      // Unspecified address (::)
      if (ipv6 === "::" || ipv6 === "0:0:0:0:0:0:0:0") return true;
    }

    return false;
  } catch {
    // Invalid URL - treat as potentially dangerous
    return true;
  }
}
