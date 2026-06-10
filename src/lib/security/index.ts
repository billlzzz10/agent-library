/**
 * SSRF Protection Utility
 *
 * Validates that a URL does not point to private/internal IP ranges.
 * This is crucial for preventing Server-Side Request Forgery (SSRF) attacks
 * when fetching user-provided URLs.
 */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Block localhost variations
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname === "::" ||
      hostname === "[::1]" ||
      hostname === "[::]"
    ) {
      return true;
    }

    // Block common internal hostnames
    if (
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".localhost")
    ) {
      return true;
    }

    // Check for IPv4 addresses in private/reserved ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);

    if (match) {
      const parts = match.slice(1).map(Number);
      const [a, b] = parts;

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

      // 100.64.0.0/10 - Carrier-grade NAT (CGNAT)
      if (a === 100 && b >= 64 && b <= 127) return true;

      // 198.18.0.0/15 - Benchmarking
      if (a === 198 && b >= 18 && b <= 19) return true;

      // 0.0.0.0/8 - Current network (only 0.0.0.0 is valid here but blocking the whole /8)
      if (a === 0) return true;

      // 224.0.0.0/4 - Multicast
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 - Reserved
      if (a >= 240) return true;
    }

    // Block IPv6 loopback, link-local, and unique local
    if (hostname.startsWith("[")) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();
      if (
        ipv6 === "::1" ||
        ipv6 === "::" ||
        ipv6.startsWith("fe80:") || // Link-local
        ipv6.startsWith("fc") ||    // Unique local (fc00::/7)
        ipv6.startsWith("fd")       // Unique local (fc00::/7)
      ) {
        return true;
      }
    }

    return false;
  } catch {
    // Invalid URL - treat as potentially dangerous
    return true;
  }
}
