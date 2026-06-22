/**
 * Security utility functions for the application.
 */

/**
 * Validates that a URL does not point to private/internal IP ranges (SSRF protection).
 * Blocks: Loopback, Private (RFC 1918), Link-local, CGNAT, Benchmarking, and Reserved ranges.
 * Also blocks localhost and common internal hostnames.
 *
 * Only allows http: and https: protocols.
 */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Only allow http and https protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return true;
    }

    let hostname = url.hostname.toLowerCase();

    // Normalize hostname: strip trailing dot (used for DNS root)
    if (hostname.endsWith('.')) {
      hostname = hostname.slice(0, -1);
    }

    // Block localhost variations
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '::1') {
      return true;
    }

    // Block common internal hostnames
    if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.localhost') || hostname.endsWith('.lan')) {
      return true;
    }

    // Check for IPv4 addresses
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);

    if (match) {
      const [, a, b, c, d] = match.map(Number);

      // Validate octets are 0-255
      if ([a, b, c, d].some(octet => octet > 255)) return true;

      // 0.0.0.0/8 - Current network
      if (a === 0) return true;

      // 10.0.0.0/8 - Private (RFC 1918)
      if (a === 10) return true;

      // 100.64.0.0/10 - Shared Address Space (CGNAT)
      if (a === 100 && (b >= 64 && b <= 127)) return true;

      // 127.0.0.0/8 - Loopback
      if (a === 127) return true;

      // 169.254.0.0/16 - Link-local
      if (a === 169 && b === 254) return true;

      // 172.16.0.0/12 - Private (RFC 1918)
      if (a === 172 && (b >= 16 && b <= 31)) return true;

      // 192.0.0.0/24 - IETF Protocol Assignments
      if (a === 192 && b === 0 && c === 0) return true;

      // 192.0.2.0/24 - Documentation (TEST-NET-1)
      if (a === 192 && b === 0 && c === 2) return true;

      // 192.88.99.0/24 - 6to4 Relay Anycast
      if (a === 192 && b === 88 && c === 99) return true;

      // 192.168.0.0/16 - Private (RFC 1918)
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

      // 255.255.255.255 - Limited Broadcast
      if (a === 255 && b === 255 && c === 255 && d === 255) return true;
    }

    // Block IPv6 loopback, link-local, and unique-local
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();
      // ::1 (Loopback)
      if (ipv6 === '::1' || ipv6 === '0:0:0:0:0:0:0:1') return true;
      // fe80::/10 (Link-local)
      if (ipv6.startsWith('fe80:')) return true;
      // fc00::/7 (Unique-local)
      if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true;
      // :: (Unspecified)
      if (ipv6 === '::' || ipv6 === '0:0:0:0:0:0:0:0') return true;
    }

    return false;
  } catch {
    // Invalid URL - treat as potentially dangerous
    return true;
  }
}
