/**
 * Security utilities for the application.
 */

/**
 * Validates that a URL does not point to private/internal IP ranges.
 * This is a mitigation against Server-Side Request Forgery (SSRF) attacks.
 *
 * Blocks:
 * - Non-HTTP/HTTPS protocols
 * - Loopback addresses (127.0.0.0/8, ::1)
 * - Private IPv4 ranges (RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - Carrier-grade NAT (100.64.0.0/10)
 * - Link-local addresses (169.254.0.0/16, fe80::/10)
 * - Documentation/Benchmarking ranges (192.0.0.0/24, 192.0.2.0/24, 198.18.0.0/15, 198.51.100.0/24, 203.0.113.0/24)
 * - Multicast (224.0.0.0/4)
 * - Reserved/Future use (240.0.0.0/4)
 * - Private IPv6 ranges (fc00::/7)
 * - Internal hostnames (.local, .internal, .localhost)
 */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Only allow http and https protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return true;
    }

    const hostname = url.hostname.toLowerCase();

    // Normalize hostname by stripping trailing dots (e.g., 127.0.0.1. -> 127.0.0.1)
    const normalizedHostname = hostname.endsWith('.') ? hostname.slice(0, -1) : hostname;

    // Block localhost and internal hostnames
    if (
      normalizedHostname === 'localhost' ||
      normalizedHostname.endsWith('.local') ||
      normalizedHostname.endsWith('.internal') ||
      normalizedHostname.endsWith('.localhost')
    ) {
      return true;
    }

    // Check for IPv4 addresses
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipv4Match = normalizedHostname.match(ipv4Regex);

    if (ipv4Match) {
      const [, a, b, c, d] = ipv4Match.map(Number);

      // Validate octets are 0-255
      if ([a, b, c, d].some(octet => octet > 255)) {
        return true; // Invalid IP, treat as dangerous
      }

      // 0.0.0.0/8 - Current network
      if (a === 0) return true;

      // 10.0.0.0/8 - Private
      if (a === 10) return true;

      // 100.64.0.0/10 - Shared Address Space (CGNAT)
      if (a === 100 && (b >= 64 && b <= 127)) return true;

      // 127.0.0.0/8 - Loopback
      if (a === 127) return true;

      // 169.254.0.0/16 - Link-local
      if (a === 169 && b === 254) return true;

      // 172.16.0.0/12 - Private (172.16.0.0 - 172.31.255.255)
      if (a === 172 && (b >= 16 && b <= 31)) return true;

      // 192.0.0.0/24 - IETF Protocol Assignments
      if (a === 192 && b === 0 && c === 0) return true;

      // 192.0.2.0/24 - Documentation (TEST-NET-1)
      if (a === 192 && b === 0 && c === 2) return true;

      // 192.168.0.0/16 - Private
      if (a === 192 && b === 168) return true;

      // 198.18.0.0/15 - Benchmarking
      if (a === 198 && (b === 18 || b === 19)) return true;

      // 198.51.100.0/24 - Documentation (TEST-NET-2)
      if (a === 198 && b === 51 && c === 100) return true;

      // 203.0.113.0/24 - Documentation (TEST-NET-3)
      if (a === 203 && b === 0 && c === 113) return true;

      // 224.0.0.0/4 - Multicast
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 - Reserved
      if (a >= 240) return true;
    }

    // Check for IPv6 addresses
    // Note: new URL() hostnames for IPv6 are enclosed in brackets, e.g., [::1]
    if (normalizedHostname.startsWith('[') && normalizedHostname.endsWith(']')) {
      const ipv6 = normalizedHostname.slice(1, -1);

      // Loopback (::1)
      if (ipv6 === '::1' || ipv6 === '0:0:0:0:0:0:0:1') return true;

      // Link-local (fe80::/10)
      if (ipv6.startsWith('fe80:')) return true;

      // Unique Local (fc00::/7)
      if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true;

      // IPv4-Mapped IPv6 (::ffff:0:0/96 or ::ffff:a.b.c.d)
      if (ipv6.startsWith('::ffff:')) {
        const lastPart = ipv6.substring(7);
        // If it's a dotted decimal IPv4
        if (ipv4Regex.test(lastPart)) {
          return isPrivateUrl(`http://${lastPart}`);
        }
        // If it's hex, the URL parser sometimes normalizes it to hex.
        // We could use an IP library but since we're restricted on dependencies,
        // we'll handle the most common normalization.
        // ::ffff:7f00:1 is 127.0.0.1
        if (lastPart === '7f00:1') return true; // 127.0.0.1
        if (lastPart.startsWith('0a')) return true; // 10.x.x.x
        if (lastPart.startsWith('ac1') || (lastPart >= 'ac10' && lastPart <= 'ac1f')) {
           // 172.16.0.0/12 is ac10:0000 to ac1f:ffff
           const hex = parseInt(lastPart.split(':')[0], 16);
           if (hex >= 0xac10 && hex <= 0xac1f) return true;
        }
        if (lastPart.startsWith('c0a8')) return true; // 192.168.x.x
      }
    }

    return false;
  } catch {
    // Invalid URL - treat as potentially dangerous
    return true;
  }
}
