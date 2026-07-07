/**
 * SSRF Protection Utility
 *
 * Validates that a URL does not point to private/internal IP ranges or hostnames.
 */
export function isPrivateUrl(urlString: string | null | undefined): boolean {
  if (!urlString) return false;

  try {
    const url = new URL(urlString);

    // Only allow http and https protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return true;
    }

    let hostname = url.hostname.toLowerCase();

    // Normalize hostname - strip trailing dot
    if (hostname.endsWith('.')) {
      hostname = hostname.slice(0, -1);
    }

    // Block localhost variations
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1') {
      return true;
    }

    // Block common internal hostnames
    if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.localhost')) {
      return true;
    }

    // Check for IPv4 addresses in private ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);

    if (match) {
      const [, a, b, c] = match.map(Number);

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

      // 0.0.0.0/8 - Current network
      if (a === 0) return true;

      // 100.64.0.0/10 - Shared Address Space (CGNAT)
      if (a === 100 && b >= 64 && b <= 127) return true;

      // 192.0.0.0/24 - IETF Protocol Assignments
      if (a === 192 && b === 0 && c === 0) return true;

      // 192.0.2.0/24 - TEST-NET-1
      if (a === 192 && b === 0 && c === 2) return true;

      // 198.18.0.0/15 - Benchmarking
      if (a === 198 && b >= 18 && b <= 19) return true;

      // 198.51.100.0/24 - TEST-NET-2
      if (a === 198 && b === 51 && c === 100) return true;

      // 203.0.113.0/24 - TEST-NET-3
      if (a === 203 && b === 0 && c === 113) return true;

      // 224.0.0.0/4 - Multicast
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 - Reserved
      if (a >= 240) return true;
    }

    // Block IPv6 loopback and private/link-local/mapped
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();

      // Loopback ::1
      if (ipv6 === '::1') return true;

      // Link-local fe80::/10
      if (ipv6.startsWith('fe80:')) return true;

      // Unique local fc00::/7 (fc00::/8 and fd00::/8)
      if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true;

      // IPv4-mapped IPv6 ::ffff:0:0/96
      if (ipv6.startsWith('::ffff:')) {
        const parts = ipv6.split(':');
        const lastPart = parts[parts.length - 1];

        if (lastPart.includes('.')) {
          // Format like ::ffff:127.0.0.1
          return isPrivateUrl(`http://${lastPart}`);
        } else {
          // Format like ::ffff:7f00:1 (Normalized by some URL parsers)
          const secondToLast = parts[parts.length - 2];
          const hex = secondToLast.padStart(4, '0') + lastPart.padStart(4, '0');
          const ip4_a = parseInt(hex.slice(0, 2), 16);
          const ip4_b = parseInt(hex.slice(2, 4), 16);
          const ip4_c = parseInt(hex.slice(4, 6), 16);
          const ip4_d = parseInt(hex.slice(6, 8), 16);
          return isPrivateUrl(`http://${ip4_a}.${ip4_b}.${ip4_c}.${ip4_d}`);
        }
      }
    }

    return false;
  } catch {
    // Invalid URL - treat as potentially dangerous
    return true;
  }
}
