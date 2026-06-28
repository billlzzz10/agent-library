/**
 * Centralized security utilities for the application.
 */

/**
 * Validates that a URL does not point to private or internal network addresses.
 * This is used to prevent Server-Side Request Forgery (SSRF) attacks.
 *
 * It blocks:
 * - Non-HTTP/HTTPS protocols
 * - Loopback addresses (localhost, 127.0.0.0/8, ::1)
 * - Private IPv4 ranges (RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - Link-local addresses (169.254.0.0/16, fe80::/10)
 * - Carrier-grade NAT (100.64.0.0/10)
 * - Benchmarking ranges (198.18.0.0/15)
 * - Multicast and reserved ranges
 * - Common internal hostnames (.local, .internal, .localhost)
 *
 * @param urlString The URL to validate
 * @returns true if the URL is private or internal, false otherwise
 */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Only allow http and https protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return true;
    }

    let hostname = url.hostname.toLowerCase();

    // Normalize hostname: strip trailing dot (standard in DNS but can be used for bypasses)
    if (hostname.endsWith('.')) {
      hostname = hostname.slice(0, -1);
    }

    // 1. Block common internal hostnames
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.localhost')
    ) {
      return true;
    }

    // 2. Check for IPv4 addresses
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipv4Match = hostname.match(ipv4Regex);

    if (ipv4Match) {
      const parts = ipv4Match.slice(1).map(Number);
      const [a, b] = parts;

      // Validate each octet
      if (parts.some(p => p > 255)) return true;

      // 127.0.0.0/8 - Loopback
      if (a === 127) return true;

      // 10.0.0.0/8 - Private (RFC 1918)
      if (a === 10) return true;

      // 172.16.0.0/12 - Private (RFC 1918)
      if (a === 172 && b >= 16 && b <= 31) return true;

      // 192.168.0.0/16 - Private (RFC 1918)
      if (a === 192 && b === 168) return true;

      // 169.254.0.0/16 - Link-local (RFC 3927)
      if (a === 169 && b === 254) return true;

      // 0.0.0.0/8 - Current network (RFC 1122)
      if (a === 0) return true;

      // 100.64.0.0/10 - Shared Address Space (RFC 6598 - CGNAT)
      if (a === 100 && b >= 64 && b <= 127) return true;

      // 198.18.0.0/15 - Benchmarking (RFC 2544)
      if (a === 198 && (b === 18 || b === 19)) return true;

      // 224.0.0.0/4 - Multicast (RFC 1112)
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 - Reserved (RFC 1112)
      if (a >= 240) return true;

      return false;
    }

    // 3. Check for IPv6 addresses
    // Hostname for IPv6 in URL is usually bracketed: [::1]
    let ipv6 = hostname;
    if (ipv6.startsWith('[') && ipv6.endsWith(']')) {
      ipv6 = ipv6.slice(1, -1);
    }

    // Simple IPv6 check for common private/internal ranges
    if (ipv6 === '::1' || ipv6 === '::' || ipv6 === '0:0:0:0:0:0:0:1' || ipv6 === '0:0:0:0:0:0:0:0') {
      return true;
    }

    // Link-local: fe80::/10
    if (ipv6.startsWith('fe80:')) return true;

    // Unique Local Address: fc00::/7 (fc00::/8 and fd00::/8)
    if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true;

    // Multicast: ff00::/8
    if (ipv6.startsWith('ff')) return true;

    return false;
  } catch {
    // Invalid URL - treat as potentially dangerous
    return true;
  }
}
