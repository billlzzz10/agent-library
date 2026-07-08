/**
 * Validates that a URL is safe to fetch by checking its protocol and ensuring
 * it doesn't point to private/internal IP ranges (SSRF protection).
 */
export function isPrivateUrl(urlString: string | null | undefined): boolean {
  if (!urlString) return false;

  try {
    const url = new URL(urlString);

    // Only allow http and https protocols
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return true;
    }

    // Normalize hostname by stripping trailing dots
    let hostname = url.hostname.toLowerCase();
    if (hostname.endsWith('.')) {
      hostname = hostname.slice(0, -1);
    }

    // Block localhost variations
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') {
      return true;
    }

    // Block common internal hostnames
    if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.localhost')) {
      return true;
    }

    // Check for IPv4 addresses
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);

    if (match) {
      const [, a, b, c, d] = match.map(Number);

      // Validate octets are 0-255
      if ([a, b, c, d].some(octet => octet < 0 || octet > 255)) return true;

      // 127.0.0.0/8 - Loopback
      if (a === 127) return true;

      // 10.0.0.0/8 - Private-Use (RFC 1918)
      if (a === 10) return true;

      // 100.64.0.0/10 - Shared Address Space (RFC 6598 - CGNAT)
      if (a === 100 && (b >= 64 && b <= 127)) return true;

      // 169.254.0.0/16 - Link-Local (RFC 3927)
      if (a === 169 && b === 254) return true;

      // 172.16.0.0/12 - Private-Use (RFC 1918)
      if (a === 172 && (b >= 16 && b <= 31)) return true;

      // 192.0.0.0/24 - IETF Protocol Assignments (RFC 6890)
      if (a === 192 && b === 0 && c === 0) return true;

      // 192.0.2.0/24 - Documentation (TEST-NET-1, RFC 5737)
      if (a === 192 && b === 0 && c === 2) return true;

      // 192.88.99.0/24 - 6to4 Relay Anycast (RFC 7526)
      if (a === 192 && b === 88 && c === 99) return true;

      // 192.168.0.0/16 - Private-Use (RFC 1918)
      if (a === 192 && b === 168) return true;

      // 198.18.0.0/15 - Benchmarking (RFC 2544)
      if (a === 198 && (b === 18 || b === 19)) return true;

      // 198.51.100.0/24 - Documentation (TEST-NET-2, RFC 5737)
      if (a === 198 && b === 51 && c === 100) return true;

      // 203.0.113.0/24 - Documentation (TEST-NET-3, RFC 5737)
      if (a === 203 && b === 0 && c === 113) return true;

      // 0.0.0.0/8 - "This" Network (RFC 1122)
      if (a === 0) return true;

      // 224.0.0.0/4 - Multicast (RFC 1112)
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 - Reserved (RFC 1112)
      if (a >= 240) return true;
    }

    // Block IPv6 private/reserved ranges
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();

      // ::1/128 - Loopback
      if (ipv6 === '::1' || ipv6 === '0:0:0:0:0:0:0:1') return true;

      // ::/128 - Unspecified
      if (ipv6 === '::' || ipv6 === '0:0:0:0:0:0:0:0') return true;

      // fe80::/10 - Link-local
      if (ipv6.startsWith('fe80:')) return true;

      // fc00::/7 - Unique local address (ULA)
      if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true;

      // ff00::/8 - Multicast
      if (ipv6.startsWith('ff')) return true;

      // IPv4-mapped IPv6 (::ffff:0:0/96)
      // Note: Node.js URL parser normalizes these to hex-shortened form
      // e.g., [::ffff:127.0.0.1] -> [::ffff:7f00:1]
      if (ipv6.startsWith('::ffff:')) {
        const parts = ipv6.split(':');
        const lastPart = parts[parts.length - 1];
        const secondToLastPart = parts[parts.length - 2];

        // If it still has dots (unlikely with Node.js parser but safe to check)
        if (lastPart.includes('.')) {
          return isPrivateUrl(`http://${lastPart}`);
        }

        // Parse hex representation of IPv4
        // ::ffff:7f00:1 -> 7f.00.0.1 -> 127.0.0.1
        try {
          const hex = secondToLastPart.padStart(4, '0') + lastPart.padStart(4, '0');
          const a = parseInt(hex.substring(0, 2), 16);
          const b = parseInt(hex.substring(2, 4), 16);
          const c = parseInt(hex.substring(4, 6), 16);
          const d = parseInt(hex.substring(6, 8), 16);

          if (!isNaN(a) && !isNaN(b) && !isNaN(c) && !isNaN(d)) {
            return isPrivateUrl(`http://${a}.${b}.${c}.${d}`);
          }
        } catch {
          // Fall through
        }
      }
    }

    return false;
  } catch {
    // Invalid URL - treat as potentially dangerous
    return true;
  }
}
