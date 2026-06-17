/**
 * Security utilities for the application.
 */

/**
 * Validates that a URL does not point to private or internal IP ranges.
 * This is used to prevent Server-Side Request Forgery (SSRF) attacks.
 *
 * Blocks:
 * - IPv4: Loopback (127.0.0.0/8), Private (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16),
 *   Link-local (169.254.0.0/16), CGNAT (100.64.0.0/10), Benchmarking (198.18.0.0/15),
 *   Multicast (224.0.0.0/4), Reserved (240.0.0.0/4), and 0.0.0.0/8.
 * - IPv6: Loopback (::1), Unique Local (fc00::/7), Link-local (fe80::/10),
 *   Multicast (ff00::/8), and unspecified (::).
 * - Hostnames: localhost, and common internal suffixes (.local, .internal, .localhost).
 */
export function isPrivateUrl(urlString: string | undefined | null): boolean {
  if (!urlString) return true;

  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Block localhost variations and common internal hostnames
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "0.0.0.0" ||
      hostname === "::" ||
      hostname === "[::]"
    ) {
      return true;
    }

    if (
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".localhost")
    ) {
      return true;
    }

    // Check for IPv4 addresses in private/reserved ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);

    if (match) {
      const [, a, b, c] = match.map(Number);

      // Basic bounds check
      if (a > 255 || b > 255 || c > 255 || match[4] === undefined || Number(match[4]) > 255) {
        return true; // Invalid IP, treat as dangerous
      }

      const d = Number(match[4]);

      // 0.0.0.0/8 - Current network (RFC 1122)
      if (a === 0) return true;

      // 10.0.0.0/8 - Private-Use (RFC 1918)
      if (a === 10) return true;

      // 100.64.0.0/10 - Shared Address Space (RFC 6598 - CGNAT)
      if (a === 100 && b >= 64 && b <= 127) return true;

      // 127.0.0.0/8 - Loopback (RFC 1122)
      if (a === 127) return true;

      // 169.254.0.0/16 - Link-Local (RFC 3927)
      if (a === 169 && b === 254) return true;

      // 172.16.0.0/12 - Private-Use (RFC 1918)
      if (a === 172 && b >= 16 && b <= 31) return true;

      // 192.0.0.0/24 - IETF Protocol Assignments (RFC 6890)
      if (a === 192 && b === 0 && c === 0) return true;

      // 192.0.2.0/24 - TEST-NET-1 (RFC 5737)
      if (a === 192 && b === 0 && c === 2) return true;

      // 192.88.99.0/24 - 6to4 Relay Anycast (RFC 7526)
      if (a === 192 && b === 88 && c === 99) return true;

      // 192.168.0.0/16 - Private-Use (RFC 1918)
      if (a === 192 && b === 168) return true;

      // 198.18.0.0/15 - Benchmarking (RFC 2544)
      if (a === 198 && b >= 18 && b <= 19) return true;

      // 198.51.100.0/24 - TEST-NET-2 (RFC 5737)
      if (a === 198 && b === 51 && c === 100) return true;

      // 203.0.113.0/24 - TEST-NET-3 (RFC 5737)
      if (a === 203 && b === 0 && c === 113) return true;

      // 224.0.0.0/4 - Multicast (RFC 1112)
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 - Reserved (RFC 1112)
      if (a >= 240) return true;

      // 255.255.255.255/32 - Limited Broadcast (RFC 919)
      if (a === 255 && b === 255 && c === 255 && d === 255) return true;
    }

    // Check for IPv6 addresses
    // Node.js URL normalization puts square brackets around IPv6 literals
    if (hostname.startsWith("[")) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();

      // ::1 - Loopback
      if (ipv6 === "::1" || ipv6 === "0:0:0:0:0:0:0:1") return true;

      // :: - Unspecified
      if (ipv6 === "::" || ipv6 === "0:0:0:0:0:0:0:0") return true;

      // fe80::/10 - Link-Local
      if (ipv6.startsWith("fe8") || ipv6.startsWith("fe9") || ipv6.startsWith("fea") || ipv6.startsWith("feb")) return true;

      // fc00::/7 - Unique Local
      if (ipv6.startsWith("fc") || ipv6.startsWith("fd")) return true;

      // ff00::/8 - Multicast
      if (ipv6.startsWith("ff")) return true;
    }

    return false;
  } catch {
    // Invalid URL - treat as potentially dangerous
    return true;
  }
}
