/**
 * SSRF protection utility.
 * Validates that a URL is safe to fetch from the server.
 * Blocks private and reserved IP ranges to prevent Server-Side Request Forgery.
 */
export function isPrivateUrl(urlString: string | null | undefined): boolean {
  if (!urlString) return false;

  try {
    const url = new URL(urlString);

    // Only allow http and https
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return true;
    }

    let hostname = url.hostname.toLowerCase();

    // Normalize hostname - remove trailing dot
    if (hostname.endsWith('.')) {
      hostname = hostname.slice(0, -1);
    }

    // Block localhost variations
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
      return true;
    }

    // Block common internal hostnames
    if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.localhost')) {
      return true;
    }

    // Check for IP addresses in private/reserved ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);

    if (match) {
      const [, a, b, c, d] = match.map(Number);

      // Validate octets (ensure they are within 0-255)
      if (a > 255 || b > 255 || c > 255 || d > 255) return true;

      // 0.0.0.0/8 - Current network
      if (a === 0) return true;

      // 10.0.0.0/8 - Private (RFC 1918)
      if (a === 10) return true;

      // 100.64.0.0/10 - Shared Address Space (CGNAT - RFC 6598)
      if (a === 100 && (b >= 64 && b <= 127)) return true;

      // 127.0.0.0/8 - Loopback (RFC 1122)
      if (a === 127) return true;

      // 169.254.0.0/16 - Link-local (RFC 3927)
      if (a === 169 && b === 254) return true;

      // 172.16.0.0/12 - Private (RFC 1918: 172.16.0.0 - 172.31.255.255)
      if (a === 172 && (b >= 16 && b <= 31)) return true;

      // 192.0.0.0/24 - IETF Protocol Assignments (RFC 6890)
      if (a === 192 && b === 0 && c === 0) return true;

      // 192.0.2.0/24 - Documentation (TEST-NET-1 - RFC 5737)
      if (a === 192 && b === 0 && c === 2) return true;

      // 192.88.99.0/24 - IPv6 to IPv4 relay (RFC 3068)
      if (a === 192 && b === 88 && c === 99) return true;

      // 192.168.0.0/16 - Private (RFC 1918)
      if (a === 192 && b === 168) return true;

      // 198.18.0.0/15 - Benchmarking (RFC 2544)
      if (a === 198 && (b >= 18 && b <= 19)) return true;

      // 198.51.100.0/24 - Documentation (TEST-NET-2 - RFC 5737)
      if (a === 198 && b === 51 && c === 100) return true;

      // 203.0.113.0/24 - Documentation (TEST-NET-3 - RFC 5737)
      if (a === 203 && b === 0 && c === 113) return true;

      // 224.0.0.0/4 - Multicast (RFC 1112)
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 - Reserved (RFC 1112)
      if (a >= 240) return true;

      // 255.255.255.255/32 - Limited Broadcast (RFC 919)
      if (a === 255 && b === 255 && c === 255 && d === 255) return true;
    }

    // Block IPv6 loopback, link-local, and unique-local
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();
      // ::1 (Loopback)
      if (ipv6 === '::1' || ipv6 === '0:0:0:0:0:0:0:1') return true;
      // fe80::/10 (Link-local)
      if (ipv6.startsWith('fe80:')) return true;
      // fc00::/7 (Unique local)
      if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true;
      // :: (Unspecified)
      if (ipv6 === '::' || ipv6 === '0:0:0:0:0:0:0:0') return true;
    } else if (hostname.includes(':')) {
       // IPv6 without brackets
       const ipv6 = hostname.toLowerCase();
       if (ipv6 === '::1' || ipv6 === '0:0:0:0:0:0:0:1') return true;
       if (ipv6.startsWith('fe80:')) return true;
       if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true;
       if (ipv6 === '::' || ipv6 === '0:0:0:0:0:0:0:0') return true;
    }

    return false;
  } catch {
    // Invalid URL - treat as potentially dangerous
    return true;
  }
}
