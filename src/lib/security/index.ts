/**
 * A10: Validates that a URL does not point to private/internal IP ranges.
 * Blocks: 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16
 * Also blocks localhost and common internal hostnames.
 */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Block localhost variations
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }

    // Block common internal hostnames
    if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.localhost')) {
      return true;
    }

    // Check for IP addresses in private ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);

    if (match) {
      const [, a, b, c] = match.map(Number);

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

      // 0.0.0.0/8 - Current network
      if (a === 0) return true;

      // 224.0.0.0/4 - Multicast
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 - Reserved
      if (a >= 240) return true;
    }

    // Block IPv6 loopback and link-local
    if (hostname.startsWith('[')) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();
      if (ipv6 === '::1' || ipv6.startsWith('fe80:') || ipv6.startsWith('fc') || ipv6.startsWith('fd')) {
        return true;
      }
    }

    return false;
  } catch {
    // Invalid URL - treat as potentially dangerous
    return true;
  }
}
