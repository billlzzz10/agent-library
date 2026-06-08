/**
 * SSRF Protection Utility
 *
 * Validates that a URL does not point to private/internal IP ranges.
 * Blocks:
 * - Loopback addresses (127.0.0.0/8, ::1)
 * - Private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - Link-local addresses (169.254.0.0/16, fe80::/10)
 * - Unique Local Addresses (fc00::/7)
 * - CGNAT (100.64.0.0/10)
 * - Benchmarking (198.18.0.0/15)
 * - Multicast (224.0.0.0/4, ff00::/8)
 * - Current network/unspecified (0.0.0.0, ::)
 * - Internal hostnames (.local, .internal, .localhost)
 */
export function isPrivateUrl(urlString: string): boolean {
  if (!urlString) return false;

  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

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
      const [, a, b] = match.map(Number);

      // 0.0.0.0/8 - Current network
      if (a === 0) return true;

      // 10.0.0.0/8 - Private (RFC1918)
      if (a === 10) return true;

      // 100.64.0.0/10 - Shared Address Space (CGNAT)
      if (a === 100 && b >= 64 && b <= 127) return true;

      // 127.0.0.0/8 - Loopback
      if (a === 127) return true;

      // 169.254.0.0/16 - Link-local
      if (a === 169 && b === 254) return true;

      // 172.16.0.0/12 - Private (RFC1918)
      if (a === 172 && b >= 16 && b <= 31) return true;

      // 192.168.0.0/16 - Private (RFC1918)
      if (a === 192 && b === 168) return true;

      // 198.18.0.0/15 - Benchmarking
      if (a === 198 && b >= 18 && b <= 19) return true;

      // 224.0.0.0/4 - Multicast
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 - Reserved
      if (a >= 240) return true;
    }

    // Block IPv6 ranges
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();

      // Loopback ::1
      if (ipv6 === '::1' || ipv6 === '0:0:0:0:0:0:0:1') return true;

      // Unspecified ::
      if (ipv6 === '::' || ipv6 === '0:0:0:0:0:0:0:0') return true;

      // Unique Local Addresses (fc00::/7)
      if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true;

      // Link-local (fe80::/10)
      if (ipv6.startsWith('fe80')) return true;

      // Multicast (ff00::/8)
      if (ipv6.startsWith('ff')) return true;
    }

    return false;
  } catch {
    // Invalid URL - treat as potentially dangerous or handle as invalid
    return true;
  }
}
