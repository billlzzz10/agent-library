/**
 * Centralized SSRF protection.
 * Validates that a URL does not point to private/internal IP ranges or hostnames.
 *
 * Blocks:
 * - Loopback addresses (127.0.0.0/8, ::1)
 * - Private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - Carrier-grade NAT (100.64.0.0/10)
 * - Link-local addresses (169.254.0.0/16, fe80::/10)
 * - Reserved/Special ranges (0.0.0.0/8, 224.0.0.0/4, 240.0.0.0/4, ::)
 * - Benchmarking (198.18.0.0/15)
 * - Internal hostnames (.local, .internal, .localhost, etc.)
 */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // 1. Block localhost and common internal hostnames
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
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".test") ||
      hostname.endsWith(".invalid") ||
      hostname.endsWith(".example")
    ) {
      return true;
    }

    // 2. Check for IPv4 addresses in private ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);

    if (match) {
      const [, a, b, c, d] = match.map(Number);

      // Basic validation of octets
      if (a > 255 || b > 255 || c > 255 || d > 255) return true;

      // 127.0.0.0/8 - Loopback
      if (a === 127) return true;

      // 10.0.0.0/8 - Private (RFC1918)
      if (a === 10) return true;

      // 172.16.0.0/12 - Private (RFC1918)
      if (a === 172 && b >= 16 && b <= 31) return true;

      // 192.168.0.0/16 - Private (RFC1918)
      if (a === 192 && b === 168) return true;

      // 169.254.0.0/16 - Link-local
      if (a === 169 && b === 254) return true;

      // 100.64.0.0/10 - Carrier-grade NAT
      if (a === 100 && b >= 64 && b <= 127) return true;

      // 198.18.0.0/15 - Benchmarking
      if (a === 198 && (b === 18 || b === 19)) return true;

      // 0.0.0.0/8 - Current network
      if (a === 0) return true;

      // 224.0.0.0/4 - Multicast
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 - Reserved
      if (a >= 240) return true;
    }

    // 3. Block IPv6 loopback and link-local/private
    // hostname from URL() for IPv6 is already normalized and wrapped in []
    if (hostname.startsWith("[")) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();

      // ::1 - Loopback
      if (ipv6 === "::1" || ipv6 === "0:0:0:0:0:0:0:1") return true;

      // fe80::/10 - Link-local
      if (ipv6.startsWith("fe80:")) return true;

      // fc00::/7 - Unique local address (fc00::/8 and fd00::/8)
      if (ipv6.startsWith("fc") || ipv6.startsWith("fd")) return true;

      // :: - Unspecified
      if (ipv6 === "::" || ipv6 === "0:0:0:0:0:0:0:0") return true;
    }

    return false;
  } catch {
    // Invalid URL - treat as potentially dangerous
    return true;
  }
}
