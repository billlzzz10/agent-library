/**
 * Security utility functions for the application.
 * Focused on preventing vulnerabilities like SSRF, XSS, etc.
 */

/**
 * Validates that a URL does not point to private/internal IP ranges or hostnames.
 * Used to prevent Server-Side Request Forgery (SSRF) attacks.
 *
 * Blocks:
 * - IPv4 Loopback (127.0.0.0/8)
 * - IPv4 Private (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - IPv4 Link-local (169.254.0.0/16)
 * - IPv4 CGNAT (100.64.0.0/10)
 * - IPv4 Benchmarking (198.18.0.0/15)
 * - IPv4 Multicast (224.0.0.0/4)
 * - IPv4 Reserved (240.0.0.0/4)
 * - IPv4 Current network (0.0.0.0/8)
 * - IPv6 Loopback (::1)
 * - IPv6 Link-local (fe80::/10)
 * - IPv6 Unique Local (fc00::/7)
 * - IPv6 Multicast (ff00::/8)
 * - Common internal hostnames (.local, .internal, .localhost, etc.)
 */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // 1. Block explicit localhost and common internal hostnames
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname === "::" ||
      hostname === "[::]"
    ) {
      return true;
    }

    if (
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".lan") ||
      hostname.endsWith(".home.arpa")
    ) {
      return true;
    }

    // 2. Check for IPv4 addresses in private/reserved ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipv4Match = hostname.match(ipv4Regex);

    if (ipv4Match) {
      const [, a, b, c] = ipv4Match.map(Number);

      // Validate each octet
      if (a > 255 || b > 255 || c > 255 || ipv4Match.map(Number)[4] > 255) return true;

      // 127.0.0.0/8 - Loopback
      if (a === 127) return true;

      // 10.0.0.0/8 - Private
      if (a === 10) return true;

      // 172.16.0.0/12 - Private (172.16.0.0 - 172.31.255.255)
      if (a === 172 && b >= 16 && b <= 31) return true;

      // 192.168.0.0/16 - Private
      if (a === 192 && b === 168) return true;

      // 169.254.0.0/16 - Link-local
      if (a === 169 && b === 254) return true;

      // 100.64.0.0/10 - Carrier-grade NAT
      if (a === 100 && b >= 64 && b <= 127) return true;

      // 198.18.0.0/15 - Benchmarking
      if (a === 198 && b >= 18 && b <= 19) return true;

      // 0.0.0.0/8 - Current network
      if (a === 0) return true;

      // 224.0.0.0/4 - Multicast
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 - Reserved
      if (a >= 240) return true;
    }

    // 3. Check for IPv6 addresses
    if (hostname.startsWith("[") && hostname.endsWith("]")) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();

      // ::1 - Loopback
      if (ipv6 === "::1" || ipv6 === "0:0:0:0:0:0:0:1") return true;

      // :: - Unspecified
      if (ipv6 === "::" || ipv6 === "0:0:0:0:0:0:0:0") return true;

      // fe80::/10 - Link-local
      if (ipv6.startsWith("fe80:")) return true;

      // fc00::/7 - Unique Local Address (ULA)
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
