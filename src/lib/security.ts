import { lookup } from "dns/promises";
import { isIP } from "net";

/**
 * Checks if an IP address is private, loopback, or otherwise restricted.
 */
export function isPrivateIP(ip: string): boolean {
  if (!ip) return false;

  const normalized = ip.toLowerCase().trim();

  // IPv6 loopback, link-local, private unique local
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  // Handle IPv4-mapped IPv6 (e.g., ::ffff:127.0.0.1 or ::ffff:7f00:1)
  let targetIp = normalized;
  if (targetIp.startsWith("::ffff:")) {
    const mapped = targetIp.substring(7);
    if (mapped.includes(".")) {
      targetIp = mapped;
    } else if (mapped.includes(":")) {
      // Hex representation e.g. 7f00:1
      const hexParts = mapped.split(":");
      if (hexParts.length === 2) {
        const high = parseInt(hexParts[0], 16);
        const low = parseInt(hexParts[1], 16);
        if (!isNaN(high) && !isNaN(low)) {
          targetIp = `${(high >> 8) & 255}.${high & 255}.${(low >> 8) & 255}.${low & 255}`;
        }
      }
    }
  }

  const parts = targetIp.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  const [a, b, c] = parts;

  // 0.0.0.0/8 - Current network
  if (a === 0) return true;
  // 10.0.0.0/8 - Private
  if (a === 10) return true;
  // 100.64.0.0/10 - Carrier-grade NAT
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 127.0.0.0/8 - Loopback
  if (a === 127) return true;
  // 169.254.0.0/16 - Link-local
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 - Private
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.0.2.0/24 - TEST-NET-1
  if (a === 192 && b === 0 && c === 2) return true;
  // 192.168.0.0/16 - Private
  if (a === 192 && b === 168) return true;
  // 198.18.0.0/15 - Benchmarking
  if (a === 198 && (b === 18 || b === 19)) return true;
  // 198.51.100.0/24 - TEST-NET-2
  if (a === 198 && b === 51 && c === 100) return true;
  // 203.0.113.0/24 - TEST-NET-3
  if (a === 203 && b === 0 && c === 113) return true;
  // 224.0.0.0/4 - Multicast & 240.0.0.0/4 - Reserved
  if (a >= 224) return true;

  return false;
}

/**
 * Validates a URL for SSRF vulnerabilities.
 * Throws an error if the URL is invalid or resolves to a restricted IP.
 */
export async function validateUrl(url: string): Promise<void> {
  if (!url || typeof url !== "string") {
    throw new Error("Invalid URL format");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Invalid protocol. Only http and https are allowed.");
  }

  // Normalize hostname (strip trailing dots and IPv6 brackets)
  let hostname = parsedUrl.hostname.toLowerCase();

  if (hostname.endsWith(".")) {
    hostname = hostname.replace(/\.+$/, "");
  }

  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    hostname = hostname.slice(1, -1);
  }

  if (!hostname) {
    throw new Error("Invalid URL format: empty hostname");
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
