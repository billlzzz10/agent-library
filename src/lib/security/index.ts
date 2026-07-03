/**
 * SSRF protection utility to validate that a URL does not point to private/internal networks.
 * Blocks common private IPv4/IPv6 ranges and internal hostnames.
 */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Only allow http and https protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return true;
    }

    const hostname = url.hostname.toLowerCase();

    // Block localhost variations
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') {
      return true;
    }

    // Block common internal hostnames
    if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.localhost') || hostname.endsWith('.lan')) {
      return true;
    }

    // Check for IP addresses in private ranges
    // IPv4 check
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipv4Match = hostname.match(ipv4Regex);

    if (ipv4Match) {
      const [, a, b, c] = ipv4Match.map(Number);

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

      // 100.64.0.0/10 - Carrier-grade NAT
      if (a === 100 && b >= 64 && b <= 127) return true;

      // 0.0.0.0/8 - Current network
      if (a === 0) return true;

      // 198.18.0.0/15 - Benchmarking
      if (a === 198 && (b === 18 || b === 19)) return true;

      // 224.0.0.0/4 - Multicast
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 - Reserved
      if (a >= 240) return true;
    }

    // IPv6 check
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();

      // ::1 - Loopback
      if (ipv6 === '::1' || ipv6 === '0:0:0:0:0:0:0:1') return true;

      // :: - Unspecified
      if (ipv6 === '::' || ipv6 === '0:0:0:0:0:0:0:0') return true;

      // fc00::/7 - Unique Local Address (fc00:: to fdff:ffff:...)
      if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true;

      // fe80::/10 - Link-local
      if (ipv6.startsWith('fe8') || ipv6.startsWith('fe9') || ipv6.startsWith('fea') || ipv6.startsWith('feb')) return true;

      // ff00::/8 - Multicast
      if (ipv6.startsWith('ff')) return true;

      // IPv4-mapped IPv6 (::ffff:127.0.0.1)
      // Normalized by URL as [::ffff:7f00:1] (hex) or similar
      if (ipv6.startsWith('::ffff:')) {
        const parts = ipv6.split(':');
        const lastPart = parts[parts.length - 1];
        const secondLastPart = parts[parts.length - 2];

        // If it's still in dotted-quad format (some parsers keep it)
        if (lastPart.includes('.')) {
          return isPrivateUrl(`http://${lastPart}`);
        }

        // If it's in hex format, we need to convert back to numbers for proper range checking.
        // Format is usually [::ffff:a0b:c0d] where a0b is (oct1 << 8) | oct2
        try {
          const hexVal = parseInt(secondLastPart, 16);
          const a = (hexVal >> 8) & 0xff;
          const b = hexVal & 0xff;

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
        } catch {
          // Fall through or ignore parse error
        }
      }
    }

    return false;
  } catch {
    // Invalid URL - treat as potentially dangerous
    return true;
  }
}
