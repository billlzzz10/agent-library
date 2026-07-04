/**
 * Security utility functions for the application.
 */

/**
 * A10: Validates that a URL does not point to private/internal IP ranges.
 * Blocks:
 * - Loopback: 127.0.0.0/8, ::1
 * - Private IPv4: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
 * - Link-local: 169.254.0.0/16, fe80::/10
 * - CGNAT: 100.64.0.0/10
 * - Benchmarking/Test-nets: 198.18.0.0/15, 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24
 * - Reserved/Current/Multicast: 0.0.0.0/8, 224.0.0.0/4, 240.0.0.0/4
 * - Unique Local IPv6: fc00::/7
 * Also blocks localhost, common internal hostnames, and IPv4-mapped IPv6 ranges.
 * Enforces http/https protocols.
 */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Strict protocol check
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return true;
    }

    let hostname = url.hostname.toLowerCase();

    // Remove trailing dot (normalization)
    if (hostname.endsWith(".")) {
      hostname = hostname.slice(0, -1);
    }

    // Strip brackets for IPv6 comparison
    const ip = hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;

    // Block localhost variations
    if (ip === "localhost" || ip === "127.0.0.1" || ip === "::1") {
      return true;
    }

    // Block common internal hostnames
    if (hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname.endsWith(".localhost")) {
      return true;
    }

    // Check for IPv4 addresses
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = ip.match(ipv4Regex);

    if (match) {
      const [, a, b, c, d] = match.map(Number);

      // Validate octets are 0-255
      if ([a, b, c, d].some(octet => octet < 0 || octet > 255)) return true;

      // 127.0.0.0/8 - Loopback
      if (a === 127) return true;
      // 10.0.0.0/8 - Private
      if (a === 10) return true;
      // 172.16.0.0/12 - Private
      if (a === 172 && b >= 16 && b <= 31) return true;
      // 192.168.0.0/16 - Private
      if (a === 192 && b === 168) return true;
      // 169.254.0.0/16 - Link-local
      if (a === 169 && b === 254) return true;
      // 100.64.0.0/10 - CGNAT
      if (a === 100 && b >= 64 && b <= 127) return true;
      // 198.18.0.0/15 - Benchmarking
      if (a === 198 && (b === 18 || b === 19)) return true;
      // 192.0.2.0/24 - TEST-NET-1
      if (a === 192 && b === 0 && c === 2) return true;
      // 198.51.100.0/24 - TEST-NET-2
      if (a === 198 && b === 51 && c === 100) return true;
      // 203.0.113.0/24 - TEST-NET-3
      if (a === 203 && b === 0 && c === 113) return true;
      // 0.0.0.0/8 - Current network
      if (a === 0) return true;
      // 224.0.0.0/4 - Multicast
      if (a >= 224 && a <= 239) return true;
      // 240.0.0.0/4 - Reserved
      if (a >= 240) return true;
    }

    // IPv6 checks (Link-local, Unique Local Address)
    if (ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) {
      return true;
    }

    // IPv4-mapped IPv6 (::ffff:0:0/96)
    // new URL() normalizes ::ffff:127.0.0.1 to [::ffff:7f00:1]
    if (ip.startsWith("::ffff:")) {
      const hexParts = ip.slice(7).split(":");
      if (hexParts.length === 2) {
        const part1 = hexParts[0].padStart(4, "0");
        const a = parseInt(part1.slice(0, 2), 16);
        const b = parseInt(part1.slice(2, 4), 16);
        const c = parseInt(hexParts[1].padStart(4, "0").slice(0, 2), 16);

        // Loopback, Private, Link-local, CGNAT, Benchmarking, Test-nets, Reserved, Multicast
        if (a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) || (a === 169 && b === 254) ||
            (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)) ||
            (a === 192 && b === 0 && c === 2) || (a === 198 && b === 51 && c === 100) ||
            (a === 203 && b === 0 && c === 113) || a === 0 || a >= 224) {
          return true;
        }
      }
    }

    return false;
  } catch {
    // Invalid URL - treat as potentially dangerous
    return true;
  }
}
