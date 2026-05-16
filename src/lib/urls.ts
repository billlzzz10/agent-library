/**
 * Generates a URL path for a prompt, including the slug if available
 * Format: /prompts/{id} or /prompts/{id}_{slug}
 */
export function getPromptUrl(id: string, slug?: string | null): string {
  if (slug) {
    return `/prompts/${id}_${slug}`;
  }
  return `/prompts/${id}`;
}

/**
 * Generates edit URL for a prompt
 */
export function getPromptEditUrl(id: string, slug?: string | null): string {
  return `${getPromptUrl(id, slug)}/edit`;
}

/**
 * Generates changes URL for a prompt
 */
export function getPromptChangesUrl(id: string, slug?: string | null): string {
  return `${getPromptUrl(id, slug)}/changes/new`;
}

/**
 * Validates that a URL does not point to private/internal IP ranges.
 * This is a defense against Server-Side Request Forgery (SSRF).
 *
 * Blocks:
 * - Localhost (127.0.0.1, ::1)
 * - Private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - Link-local ranges (169.254.0.0/16, fe80::/10)
 * - Private IPv6 ranges (fc00::/7)
 * - Other reserved/special ranges (0.0.0.0/8, 224.0.0.0/4, etc.)
 */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // 1. Block localhost and internal domain names
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".localhost")
    ) {
      return true;
    }

    // 2. Check for IPv4 addresses
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);

    if (match) {
      const parts = match.slice(1).map((p) => parseInt(p, 10));

      // Ensure all parts are valid (0-255) - URL constructor usually handles this
      if (parts.some((p) => p > 255)) return true;

      const [a, b] = parts;

      // 127.0.0.0/8 - Loopback
      if (a === 127) return true;

      // 10.0.0.0/8 - Private (Class A)
      if (a === 10) return true;

      // 172.16.0.0/12 - Private (Class B): 172.16.0.0 - 172.31.255.255
      if (a === 172 && b >= 16 && b <= 31) return true;

      // 192.168.0.0/16 - Private (Class C)
      if (a === 192 && b === 168) return true;

      // 169.254.0.0/16 - Link-local (APIPA)
      if (a === 169 && b === 254) return true;

      // 0.0.0.0/8 - Current network
      if (a === 0) return true;

      // 100.64.0.0/10 - Shared Address Space (CGNAT)
      if (a === 100 && b >= 64 && b <= 127) return true;

      // 192.0.0.0/24 - IETF Protocol Assignments
      if (a === 192 && b === 0 && parts[2] === 0) return true;

      // 198.18.0.0/15 - Benchmarking
      if (a === 198 && b >= 18 && b <= 19) return true;

      // 224.0.0.0/4 - Multicast
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 - Reserved (Future Use)
      if (a >= 240) return true;

      return false;
    }

    // 3. Check for IPv6 addresses
    // Standard URL constructor wraps IPv6 in brackets: [::1]
    if (hostname.startsWith("[") && hostname.endsWith("]")) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();

      // Loopback
      if (ipv6 === "::1" || ipv6 === "0:0:0:0:0:0:0:1") return true;

      // Unique Local Address (fc00::/7)
      if (ipv6.startsWith("fc") || ipv6.startsWith("fd")) return true;

      // Link-Local (fe80::/10)
      if (ipv6.startsWith("fe8") || ipv6.startsWith("fe9") || ipv6.startsWith("fea") || ipv6.startsWith("feb")) return true;

      // Multicast (ff00::/8)
      if (ipv6.startsWith("ff")) return true;

      // Unspecified
      if (ipv6 === "::" || ipv6 === "0:0:0:0:0:0:0:0") return true;

      return false;
    }

    return false;
  } catch {
    // Invalid URL - treat as potentially dangerous
    return true;
  }
}
