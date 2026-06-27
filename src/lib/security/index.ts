/**
 * Security utilities for protecting against common vulnerabilities.
 */

/**
 * Validates that a URL is safe to fetch from the server.
 * Protects against Server-Side Request Forgery (SSRF) by blocking:
 * - Non-HTTP(S) protocols
 * - Loopback addresses (localhost, 127.0.0.1, ::1)
 * - Private IPv4 ranges (RFC 1918)
 * - Carrier-grade NAT (100.64.0.0/10)
 * - Link-local addresses (169.254.0.0/16, fe80::/10)
 * - Documentation/Benchmarking/Reserved ranges
 * - Internal/Local hostnames (.local, .internal, .localhost)
 *
 * @param urlString The URL to validate
 * @returns true if the URL is private/unsafe, false if it appears public/safe
 */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // 1. Protocol Enforcement: Only allow http and https
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return true;
    }

    let hostname = url.hostname.toLowerCase();

    // 2. Normalization: Remove trailing dot in hostname (e.g., "google.com." is valid)
    if (hostname.endsWith(".")) {
      hostname = hostname.slice(0, -1);
    }

    // 3. Block localhost and internal hostnames
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname === "::1" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".localhost")
    ) {
      return true;
    }

    // 4. Validate IPv4 ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipv4Match = hostname.match(ipv4Regex);

    if (ipv4Match) {
      const [, a, b, c, d] = ipv4Match.map(Number);

      // Basic octet validation (0-255)
      if ([a, b, c, d].some(octet => octet < 0 || octet > 255)) {
        return true; // Invalid IP, treat as unsafe
      }

      // 0.0.0.0/8 - Current network
      if (a === 0) return true;

      // 10.0.0.0/8 - Private-Use (RFC 1918)
      if (a === 10) return true;

      // 100.64.0.0/10 - Shared Address Space (CGNAT)
      if (a === 100 && (b >= 64 && b <= 127)) return true;

      // 127.0.0.0/8 - Loopback (RFC 1122)
      if (a === 127) return true;

      // 169.254.0.0/16 - Link-Local (RFC 3927)
      if (a === 169 && b === 254) return true;

      // 172.16.0.0/12 - Private-Use (RFC 1918)
      if (a === 172 && (b >= 16 && b <= 31)) return true;

      // 192.0.0.0/24 - IETF Protocol Assignments
      if (a === 192 && b === 0 && c === 0) return true;

      // 192.0.2.0/24 - Documentation (TEST-NET-1)
      if (a === 192 && b === 0 && c === 2) return true;

      // 192.88.99.0/24 - Reserved
      if (a === 192 && b === 88 && c === 99) return true;

      // 192.168.0.0/16 - Private-Use (RFC 1918)
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

      // 255.255.255.255/32 - Limited Broadcast
      if (a === 255 && b === 255 && c === 255 && d === 255) return true;
    }

    // 5. Validate IPv6 ranges
    if (hostname.startsWith("[") && hostname.endsWith("]")) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();

      // Loopback
      if (ipv6 === "::1" || ipv6 === "0:0:0:0:0:0:0:1") return true;

      // Unspecified
      if (ipv6 === "::" || ipv6 === "0:0:0:0:0:0:0:0") return true;

      // Link-local (fe80::/10)
      if (ipv6.startsWith("fe80:")) return true;

      // Unique local (fc00::/7)
      if (ipv6.startsWith("fc") || ipv6.startsWith("fd")) return true;

      // Multicast (ff00::/8)
      if (ipv6.startsWith("ff")) return true;

      // Documentation (2001:db8::/32)
      if (ipv6.startsWith("2001:db8:")) return true;
    }

    return false;
  } catch {
    // Invalid URL - treat as unsafe to be secure by default
    return true;
  }
}
