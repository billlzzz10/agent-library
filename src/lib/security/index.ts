/**
 * Security utilities for protecting the application from common vulnerabilities.
 */

/**
 * Validates that a URL does not point to private/internal IP ranges.
 * This is used to prevent Server-Side Request Forgery (SSRF) attacks.
 *
 * Blocks:
 * - Loopback addresses (127.0.0.0/8, ::1)
 * - Private IPv4 ranges (RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - Link-local addresses (169.254.0.0/16, fe80::/10)
 * - Carrier-grade NAT (100.64.0.0/10)
 * - Benchmarking ranges (198.18.0.0/15)
 * - Multicast addresses (224.0.0.0/4, ff00::/8)
 * - Reserved/Future use (240.0.0.0/4)
 * - Localhost and common internal hostnames (.local, .internal, .localhost)
 */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Block localhost variations
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0' || hostname === '[::]') {
      return true;
    }

    // Block common internal hostnames
    if (
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.localhost') ||
      hostname === 'internal'
    ) {
      return true;
    }

    // Check for IP addresses in private ranges
    // Node.js new URL().hostname already normalizes most formats (decimal, hex, octal)
    // for IPv4 into standard dotted-decimal or IPv6 format.
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);

    if (match) {
      const [, a, b, c] = match.map(Number);

      // 127.0.0.0/8 - Loopback
      if (a === 127) return true;

      // 10.0.0.0/8 - Private
      if (a === 10) return true;

      // 100.64.0.0/10 - Carrier-grade NAT
      if (a === 100 && b >= 64 && b <= 127) return true;

      // 172.16.0.0/12 - Private (172.16.0.0 - 172.31.255.255)
      if (a === 172 && b >= 16 && b <= 31) return true;

      // 192.168.0.0/16 - Private
      if (a === 192 && b === 168) return true;

      // 169.254.0.0/16 - Link-local
      if (a === 169 && b === 254) return true;

      // 198.18.0.0/15 - Benchmarking
      if (a === 198 && (b === 18 || b === 19)) return true;

      // 0.0.0.0/8 - Current network
      if (a === 0) return true;

      // 224.0.0.0/4 - Multicast
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 - Reserved
      if (a >= 240) return true;
    }

    // Block IPv6 private and reserved ranges
    if (hostname.startsWith('[')) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();
      // ::1 - Loopback
      if (ipv6 === '::1' || ipv6 === '::' || ipv6 === '0:0:0:0:0:0:0:1' || ipv6 === '0:0:0:0:0:0:0:0') return true;
      // fe80::/10 - Link-local
      if (ipv6.startsWith('fe80:')) return true;
      // fc00::/7 - Unique local address (fc00::/8 and fd00::/8)
      if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true;
      // ff00::/8 - Multicast
      if (ipv6.startsWith('ff')) return true;
      // IPv4-mapped IPv6 addresses (::ffff:127.0.0.1 etc)
      if (ipv6.includes('ffff:')) {
        const parts = ipv6.split(':');
        const ffffIndex = parts.indexOf('ffff');
        if (ffffIndex !== -1 && ffffIndex < parts.length - 1) {
          const remainingParts = parts.slice(ffffIndex + 1);
          const lastPart = remainingParts.join(':');

          if (ipv4Regex.test(lastPart)) {
            if (isPrivateUrl(`http://${lastPart}`)) return true;
          }

          // Check hex segments for private IPv4 patterns
          for (const segment of remainingParts) {
            const hex = segment.padStart(4, '0');
            if (hex.startsWith('7f')) return true; // 127.x.x.x
            if (hex.startsWith('0a')) return true; // 10.x.x.x
            if (hex.startsWith('ac1')) return true; // 172.16.x.x - 172.31.x.x
            if (hex.startsWith('c0a8')) return true; // 192.168.x.x
            if (hex.startsWith('a9fe')) return true; // 169.254.x.x
            if (hex === '0000') return true; // 0.x.x.x
          }
        }
      }
    }

    return false;
  } catch {
    // Invalid URL - treat as potentially dangerous
    return true;
  }
}
