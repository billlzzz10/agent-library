/**
 * SSRF Protection Utility
 *
 * Validates that a URL does not point to private/internal IP ranges or hostnames.
 * Blocks loopback, private, link-local, and reserved IP ranges.
 */

/**
 * Validates that a URL is safe to fetch from the server (SSRF protection).
 *
 * @param urlString The URL to validate
 * @returns true if the URL is private/internal/unsafe, false otherwise
 */
export function isPrivateUrl(urlString: string): boolean {
  if (!urlString) return false;

  try {
    const url = new URL(urlString);

    // 1. Protocol Enforcement
    // Only allow http and https to prevent other protocols (file://, gopher://, etc.)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return true;
    }

    let hostname = url.hostname.toLowerCase();

    // Normalization: Strip trailing dot if present
    if (hostname.endsWith('.')) {
      hostname = hostname.slice(0, -1);
    }

    // 2. Hostname-based checks
    // Block localhost variations
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1') {
      return true;
    }

    // Block common internal TLDs and suffixes
    if (
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.invalid') ||
      hostname.endsWith('.test') ||
      hostname.endsWith('.example')
    ) {
      return true;
    }

    // 3. IP-based checks (IPv4)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);

    if (match) {
      const [, a, b, c, d] = match.map(Number);

      // Validate octets are within 0-255
      if ([a, b, c, d].some(octet => octet < 0 || octet > 255)) {
        return true; // Malformed IP
      }

      // 127.0.0.0/8 - Loopback
      if (a === 127) return true;

      // 10.0.0.0/8 - Private (RFC 1918)
      if (a === 10) return true;

      // 172.16.0.0/12 - Private (RFC 1918: 172.16.0.0 - 172.31.255.255)
      if (a === 172 && b >= 16 && b <= 31) return true;

      // 192.168.0.0/16 - Private (RFC 1918)
      if (a === 192 && b === 168) return true;

      // 169.254.0.0/16 - Link-local (RFC 3927)
      if (a === 169 && b === 254) return true;

      // 0.0.0.0/8 - Current network (RFC 1122)
      if (a === 0) return true;

      // 100.64.0.0/10 - Shared Address Space (RFC 6598 - CGNAT)
      if (a === 100 && b >= 64 && b <= 127) return true;

      // 192.0.0.0/24 - IETF Protocol Assignments (RFC 6890)
      if (a === 192 && b === 0 && c === 0) return true;

      // 192.0.2.0/24 - TEST-NET-1 (RFC 5737)
      if (a === 192 && b === 0 && c === 2) return true;

      // 198.18.0.0/15 - Benchmarking (RFC 2544)
      if (a === 198 && b >= 18 && b <= 19) return true;

      // 198.51.100.0/24 - TEST-NET-2 (RFC 5737)
      if (a === 198 && b === 51 && c === 100) return true;

      // 203.0.113.0/24 - TEST-NET-3 (RFC 5737)
      if (a === 203 && b === 0 && c === 113) return true;

      // 224.0.0.0/4 - Multicast (RFC 1112)
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 - Reserved (RFC 1112)
      if (a >= 240) return true;

      // 255.255.255.255 - Limited Broadcast
      if (a === 255 && b === 255 && c === 255 && d === 255) return true;
    }

    // 4. IP-based checks (IPv6)
    // new URL() normalizes IPv6 hostnames to be wrapped in brackets [::1]
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();

      // ::1/128 - Loopback
      if (ipv6 === '::1' || ipv6 === '0:0:0:0:0:0:0:1') return true;

      // ::/128 - Unspecified
      if (ipv6 === '::' || ipv6 === '0:0:0:0:0:0:0:0') return true;

      // fe80::/10 - Link-local
      if (ipv6.startsWith('fe80:')) return true;

      // fc00::/7 - Unique Local Address (ULA)
      if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true;

      // ::ffff:0:0/96 - IPv4-mapped IPv6
      if (ipv6.startsWith('::ffff:')) {
        const parts = ipv6.split(':');
        const lastPart = parts[parts.length - 1];

        // If the last part contains dots, it's ::ffff:127.0.0.1 style
        if (lastPart && lastPart.includes('.')) {
          return isPrivateUrl(`http://${lastPart}`);
        }

        // Handle hex format e.g. ::ffff:7f00:1 (127.0.0.1)
        // We need the last 32 bits of the address
        const segments = parts.filter(s => s !== '' && s !== 'ffff');
        if (segments.length >= 1) {
          // Get the last two 16-bit segments
          const s2 = segments[segments.length - 1] || '0';
          const s1 = segments[segments.length - 2] || '0';

          const v12 = parseInt(s1, 16);
          const v34 = parseInt(s2, 16);

          if (!isNaN(v12) && !isNaN(v34)) {
            const a = (v12 >> 8) & 0xff;
            const b = v12 & 0xff;
            const c = (v34 >> 8) & 0xff;
            const d = v34 & 0xff;
            return isPrivateUrl(`http://${a}.${b}.${c}.${d}`);
          }
        }
      }
    }

    return false;
  } catch {
    // Malformed URL - treat as potentially dangerous
    return true;
  }
}
