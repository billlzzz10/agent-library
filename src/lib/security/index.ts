/**
 * SSRF Protection Utility
 * Validates that a URL is safe to fetch from the server.
 * Blocks:
 * - Protocols other than http: and https:
 * - Private/internal IP ranges (IPv4 & IPv6)
 * - Localhost variations
 * - Common internal hostnames
 */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // 1. Strict protocol enforcement
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return true;
    }

    // 2. Normalize and strip trailing dot from hostname
    let hostname = url.hostname.toLowerCase();
    if (hostname.endsWith('.')) {
      hostname = hostname.slice(0, -1);
    }

    // 3. Block localhost variations
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1') {
      return true;
    }

    // 4. Block common internal hostnames
    if (
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.lan')
    ) {
      return true;
    }

    // 5. Check for IPv4 addresses
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipv4Match = hostname.match(ipv4Regex);

    if (ipv4Match) {
      const [, a, b, c, d] = ipv4Match.map(Number);

      // Validate octets are valid
      if ([a, b, c, d].some(octet => octet > 255)) return true;

      // 0.0.0.0/8 - Current network
      if (a === 0) return true;

      // 10.0.0.0/8 - Private (RFC 1918)
      if (a === 10) return true;

      // 100.64.0.0/10 - CGNAT (RFC 6598)
      if (a === 100 && b >= 64 && b <= 127) return true;

      // 127.0.0.0/8 - Loopback
      if (a === 127) return true;

      // 169.254.0.0/16 - Link-local (RFC 3927)
      if (a === 169 && b === 254) return true;

      // 172.16.0.0/12 - Private (RFC 1918)
      if (a === 172 && b >= 16 && b <= 31) return true;

      // 192.0.0.0/24 - IETF Protocol Assignments
      if (a === 192 && b === 0 && c === 0) return true;

      // 192.0.2.0/24 - TEST-NET-1 (RFC 5737)
      if (a === 192 && b === 0 && c === 2) return true;

      // 192.88.99.0/24 - 6to4 Relay (RFC 3068)
      if (a === 192 && b === 88 && c === 99) return true;

      // 192.168.0.0/16 - Private (RFC 1918)
      if (a === 192 && b === 168) return true;

      // 198.18.0.0/15 - Benchmarking (RFC 2544)
      if (a === 198 && (b === 18 || b === 19)) return true;

      // 198.51.100.0/24 - TEST-NET-2 (RFC 5737)
      if (a === 198 && b === 51 && c === 100) return true;

      // 203.0.113.0/24 - TEST-NET-3 (RFC 5737)
      if (a === 203 && b === 0 && c === 113) return true;

      // 224.0.0.0/4 - Multicast (RFC 5771)
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 - Reserved (RFC 1112)
      if (a >= 240) return true;
    }

    // 6. Check for IPv6 addresses
    // URL parser wraps IPv6 in brackets
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      const ipv6 = hostname.slice(1, -1);

      // Loopback
      if (ipv6 === '::1') return true;

      // Link-local (fe80::/10)
      if (ipv6.startsWith('fe80:')) return true;

      // Unique-local (fc00::/7)
      if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true;

      // Multicast (ff00::/8)
      if (ipv6.startsWith('ff')) return true;

      // IPv4-mapped IPv6 (::ffff:0:0/96)
      // Normalized form from new URL() can be [::ffff:127.0.0.1] or [::ffff:7f00:1]
      if (ipv6.startsWith('::ffff:')) {
        const parts = ipv6.split(':');
        const lastPart = parts[parts.length - 1];
        const secondLastPart = parts[parts.length - 2];

        // Case 1: [::ffff:127.0.0.1]
        if (ipv4Regex.test(lastPart)) {
          return isPrivateUrl(`http://${lastPart}`);
        }

        // Case 2: [::ffff:7f00:1]
        // Parse hex segments into decimal octets
        try {
          // secondLastPart is 7f00, lastPart is 1
          const octet1 = parseInt(secondLastPart.padStart(4, '0').slice(0, 2), 16);
          const octet2 = parseInt(secondLastPart.padStart(4, '0').slice(2), 16);
          const octet3 = parseInt(lastPart.padStart(4, '0').slice(0, 2), 16);
          const octet4 = parseInt(lastPart.padStart(4, '0').slice(2), 16);
          return isPrivateUrl(`http://${octet1}.${octet2}.${octet3}.${octet4}`);
        } catch {
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
