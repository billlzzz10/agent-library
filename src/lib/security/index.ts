/**
 * Security utility for Server-Side Request Forgery (SSRF) protection.
 */

/**
 * Validates that a URL does not point to private, reserved, or internal network ranges.
 * This is used to prevent SSRF attacks where a user might try to make the server
 * fetch internal resources.
 *
 * Blocks:
 * - IPv4 Loopback: 127.0.0.0/8
 * - IPv4 Private (RFC 1918): 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
 * - IPv4 Link-local: 169.254.0.0/16
 * - IPv4 CGNAT: 100.64.0.0/10
 * - IPv4 Benchmarking: 198.18.0.0/15
 * - IPv4 Reserved/Current Network: 0.0.0.0/8, 240.0.0.0/4
 * - IPv4 Multicast: 224.0.0.0/4
 * - IPv6 Loopback: ::1/128
 * - IPv6 Link-local: fe80::/10
 * - IPv6 Unique Local: fc00::/7
 * - IPv6 Multicast: ff00::/8
 * - Internal Hostnames: .local, .internal, .localhost, localhost
 */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // 1. Block known internal hostnames
    if (
      hostname === "localhost" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".localhost")
    ) {
      return true;
    }

    // 2. Check for IPv4 addresses
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipv4Match = hostname.match(ipv4Regex);

    if (ipv4Match) {
      const parts = ipv4Match.slice(1).map(Number);
      if (parts.some((p) => p > 255)) return true; // Invalid IP, but safer to block

      const [a, b] = parts;

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

      // 100.64.0.0/10 - Carrier-grade NAT (100.64.0.0 - 100.127.255.255)
      if (a === 100 && b >= 64 && b <= 127) return true;

      // 198.18.0.0/15 - Benchmarking (198.18.0.0 - 198.19.255.255)
      if (a === 198 && (b === 18 || b === 19)) return true;

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

      // Normalize common forms
      if (
        ipv6 === "::1" ||
        ipv6 === "0:0:0:0:0:0:0:1" ||
        ipv6 === "::" ||
        ipv6 === "0:0:0:0:0:0:0:0"
      ) {
        return true;
      }

      // Link-local (fe80::/10), Unique Local (fc00::/7), Multicast (ff00::/8)
      if (
        ipv6.startsWith("fe8") ||
        ipv6.startsWith("fe9") ||
        ipv6.startsWith("fea") ||
        ipv6.startsWith("feb") ||
        ipv6.startsWith("fc") ||
        ipv6.startsWith("fd") ||
        ipv6.startsWith("ff")
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
