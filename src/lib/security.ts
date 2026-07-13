import { lookup } from "dns/promises";
import { isIP } from "net";

/**
 * Checks if an IP address is private, loopback, or otherwise restricted.
 * Implementation avoids external dependencies for core security logic.
 */
function isPrivateIP(ip: string): boolean {
  // IPv6 checks
  if (ip === "::1" || ip === "::") return true;
  if (ip.startsWith("fe80:")) return true; // link-local
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // unique local

  // Handle IPv4-mapped IPv6 (e.g., ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (ip.startsWith("::ffff:")) {
    const mapped = ip.slice(7);
    if (isIP(mapped) === 4) return isPrivateIP(mapped);

    // Handle hex format like ::ffff:7f00:1
    const segments = mapped.split(":");
    if (segments.length === 2) {
      const parts = segments.map((s) => parseInt(s.padStart(4, "0"), 16));
      const a = (parts[0] >> 8) & 0xff;
      const b = parts[0] & 0xff;
      const c = (parts[1] >> 8) & 0xff;
      const d = parts[1] & 0xff;
      return isPrivateIP(`${a}.${b}.${c}.${d}`);
    }
  }

  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false;

  const [a, b, c, d] = parts;

  // 127.0.0.0/8 - Loopback
  if (a === 127) return true;
  // 10.0.0.0/8 - Private
  if (a === 10) return true;
  // 172.16.0.0/12 - Private
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 - Private
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 - Link-local
  if (a === 169 && b === 254) return true;
  // 0.0.0.0/8 - Current network
  if (a === 0) return true;
  // 100.64.0.0/10 - Carrier-grade NAT
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 192.0.0.0/24 - IETF Protocol Assignments
  if (a === 192 && b === 0 && c === 0) return true;
  // 192.0.2.0/24 - Test-net 1
  if (a === 192 && b === 0 && c === 2) return true;
  // 198.18.0.0/15 - Benchmarking
  if (a === 198 && (b === 18 || b === 19)) return true;
  // 198.51.100.0/24 - Test-net 2
  if (a === 198 && b === 51 && c === 100) return true;
  // 203.0.113.0/24 - Test-net 3
  if (a === 203 && b === 0 && c === 113) return true;
  // 224.0.0.0/4 - Multicast
  if (a >= 224 && a <= 239) return true;
  // 240.0.0.0/4 - Reserved
  if (a >= 240) return true;

  return false;
}

/**
 * Validates a URL for SSRF vulnerabilities.
 * Throws an error if the URL is invalid or resolves to a restricted IP.
 */
export async function validateUrl(url: string): Promise<void> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Invalid protocol. Only http and https are allowed.");
  }

  // Normalize hostname (strip trailing dots for FQDN bypasses)
  let hostname = parsedUrl.hostname.toLowerCase();
  if (hostname.endsWith(".")) {
    hostname = hostname.slice(0, -1);
  }

  if (!hostname) {
    throw new Error("Invalid hostname");
  }

  // Block hostnames ending in common internal TLDs
  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".localhost")
  ) {
    throw new Error(`Access to internal hostname ${hostname} is forbidden.`);
  }

  // Skip DNS lookup if hostname is an IP literal and check directly
  if (isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      throw new Error(`Access to restricted IP address ${hostname} is forbidden.`);
    }
    return;
  }

  try {
    const { address } = await lookup(hostname);
    if (isPrivateIP(address)) {
      throw new Error(
        `Access to restricted IP address ${address} (resolved from ${hostname}) is forbidden.`
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Access to restricted IP")) {
      throw error;
    }
    throw new Error(`Failed to resolve hostname: ${hostname}`);
  }
}
