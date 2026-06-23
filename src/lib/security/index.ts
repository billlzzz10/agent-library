/**
 * Security utilities for the application.
 * Focuses on protecting against common web vulnerabilities.
 */

/**
 * Validates that a URL does not point to private or internal IP ranges.
 * This is a defense against Server-Side Request Forgery (SSRF).
 *
 * Blocks:
 * - Loopback: 127.0.0.0/8, ::1
 * - Private IPv4 (RFC 1918): 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
 * - Link-local: 169.254.0.0/16, fe80::/10
 * - CGNAT: 100.64.0.0/10
 * - Benchmarking: 198.18.0.0/15
 * - Multicast: 224.0.0.0/4, ff00::/8
 * - Reserved/Current: 0.0.0.0/8, 240.0.0.0/4
 * - Unique Local (IPv6): fc00::/7
 */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Only allow http and https
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return true;
    }

    let hostname = url.hostname.toLowerCase();

    // Normalize hostname: remove trailing dots which can bypass some filters
    if (hostname.endsWith('.')) {
      hostname = hostname.slice(0, -1);
    }

    // Block localhost and common internal hostnames
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname === '[::1]'
    ) {
      return true;
    }

    if (
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.lan')
    ) {
      return true;
    }

    // Check for IPv4 addresses in private/reserved ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);

    if (match) {
      const [, a, b, c] = match.map(Number);

      // Basic octet validation (URL parser usually handles this, but let's be sure)
      if (a > 255 || b > 255 || c > 255 || Number(match[4]) > 255) return true;

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

      // 192.168.0.0/16 - Private (RFC 1918)
      if (a === 192 && b === 168) return true;

      // 198.18.0.0/15 - Benchmarking
      if (a === 198 && b >= 18 && b <= 19) return true;

      // 224.0.0.0/4 - Multicast
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 - Reserved
      if (a >= 240) return true;
    }

    // Block IPv6 private/reserved ranges
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();

      // Loopback
      if (ipv6 === '::1' || ipv6 === '0:0:0:0:0:0:0:1') return true;

      // Link-local (fe80::/10)
      if (ipv6.startsWith('fe8') || ipv6.startsWith('fe9') || ipv6.startsWith('fea') || ipv6.startsWith('feb')) return true;

      // Unique Local (fc00::/7 -> fc00::/8 and fd00::/8)
      if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true;

      // Multicast (ff00::/8)
      if (ipv6.startsWith('ff')) return true;

      // Unspecified
      if (ipv6 === '::' || ipv6 === '0:0:0:0:0:0:0:0') return true;
    }

    return false;
  } catch {
    // Invalid URL - treat as potentially dangerous
    return true;
  }
}
