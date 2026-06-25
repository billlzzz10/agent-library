/**
 * Security utilities for the application.
 * Focuses on protecting against common web vulnerabilities like SSRF.
 */

/**
 * Validates that a URL does not point to private/internal IP ranges or hostnames.
 * Used to prevent Server-Side Request Forgery (SSRF).
 *
 * Blocks:
 * - Localhost and its variations
 * - Internal hostnames (.local, .internal, .localhost)
 * - Private IPv4 ranges (RFC 1918)
 * - Link-local IPv4 and IPv6
 * - CGNAT, Benchmarking, Multicast, and Reserved IPv4 ranges
 * - Unique Local and Multicast IPv6 ranges
 *
 * @param urlString The URL to validate
 * @returns true if the URL is private/internal/dangerous, false otherwise
 */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // 1. Protocol Enforcement: Only allow http and https
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return true;
    }

    // 2. Hostname Normalization: Strip trailing dots (e.g., "127.0.0.1.")
    let hostname = url.hostname.toLowerCase();
    if (hostname.endsWith('.')) {
      hostname = hostname.slice(0, -1);
    }

    // 3. Block localhost variations
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '::1' || hostname === '[::1]') {
      return true;
    }

    // 4. Block common internal hostnames
    if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.localhost')) {
      return true;
    }

    // 5. Check for IPv4 addresses and block private/reserved ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipv4Match = hostname.match(ipv4Regex);

    if (ipv4Match) {
      const [, a, b, c, d] = ipv4Match.map(Number);

      // Validate octets are within 0-255
      if ([a, b, c, d].some(octet => octet < 0 || octet > 255)) {
        return true; // Invalid IP, treat as dangerous
      }

      // 0.0.0.0/8 - Current network
      if (a === 0) return true;

      // 10.0.0.0/8 - Private (RFC 1918)
      if (a === 10) return true;

      // 100.64.0.0/10 - Shared Address Space (CGNAT)
      if (a === 100 && b >= 64 && b <= 127) return true;

      // 127.0.0.0/8 - Loopback (RFC 1122)
      if (a === 127) return true;

      // 169.254.0.0/16 - Link-local (RFC 3927)
      if (a === 169 && b === 254) return true;

      // 172.16.0.0/12 - Private (RFC 1918)
      if (a === 172 && b >= 16 && b <= 31) return true;

      // 192.168.0.0/16 - Private (RFC 1918)
      if (a === 192 && b === 168) return true;

      // 198.18.0.0/15 - Benchmarking (RFC 2544)
      if (a === 198 && (b === 18 || b === 19)) return true;

      // 224.0.0.0/4 - Multicast (RFC 1112)
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 - Reserved (RFC 1112)
      if (a >= 240) return true;
    }

    // 6. Block IPv6 private/reserved ranges
    // Simple check for common patterns; more robust IPv6 parsing is complex
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();

      // ::1 - Loopback
      if (ipv6 === '::1' || ipv6 === '0:0:0:0:0:0:0:1') return true;

      // :: - Unspecified
      if (ipv6 === '::' || ipv6 === '0:0:0:0:0:0:0:0') return true;

      // fe80::/10 - Link-local
      if (ipv6.startsWith('fe80:')) return true;

      // fc00::/7 - Unique local
      if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true;

      // ff00::/8 - Multicast
      if (ipv6.startsWith('ff')) return true;
    }

    return false;
  } catch {
    // Invalid URL - treat as potentially dangerous
    return true;
  }
}
