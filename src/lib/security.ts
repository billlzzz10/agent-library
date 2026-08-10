import { lookup } from "dns/promises";
import { isIP } from "net";

/**
 * Checks if an IP address is private, loopback, or otherwise restricted.
 */
function isPrivateIP(ip: string): boolean {
  const checkIp = ip.toLowerCase().trim();

  // Handle IPv6 loopback, unspecified, link-local, and unique local
  if (checkIp === "::1" || checkIp === "::" || checkIp === "0:0:0:0:0:0:0:0") return true;
  if (checkIp.startsWith("fe80:")) return true; // IPv6 link-local
  if (checkIp.startsWith("fc") || checkIp.startsWith("fd")) return true; // IPv6 private unique local

  // Handle IPv4-mapped IPv6 addresses (e.g., ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (checkIp.startsWith("::ffff:")) {
    const mapped = checkIp.slice(7);
    if (mapped.includes(".")) {
      return isPrivateIP(mapped);
    } else {
      const hexParts = mapped.split(":");
      if (hexParts.length === 2) {
        const seg1 = hexParts[0].padStart(4, "0");
        const seg2 = hexParts[1].padStart(4, "0");
        const oct1 = parseInt(seg1.slice(0, 2), 16);
        const oct2 = parseInt(seg1.slice(2, 4), 16);
        const oct3 = parseInt(seg2.slice(0, 2), 16);
        const oct4 = parseInt(seg2.slice(2, 4), 16);
        if (!isNaN(oct1) && !isNaN(oct2) && !isNaN(oct3) && !isNaN(oct4)) {
          return isPrivateIP(`${oct1}.${oct2}.${oct3}.${oct4}`);
        }
      }
    }
  }

  const parts = checkIp.split(".").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false;

  // RFC 1918 Private Ranges & Loopback & Special Ranges
  if (parts[0] === 10) return true; // 10.0.0.0/8
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
  if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
  if (parts[0] === 127) return true; // 127.0.0.0/8 (Loopback)
  if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.0.0/16 (Link-local)
  if (parts[0] === 0) return true; // 0.0.0.0/8 (Current network)

  // Carrier-Grade NAT (RFC 6598)
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true; // 100.64.0.0/10

  // Benchmark Testing (RFC 2544)
  if (parts[0] === 198 && parts[1] >= 18 && parts[1] <= 19) return true; // 198.18.0.0/15

  // Test-net Ranges (RFC 5737)
  if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true; // 192.0.2.0/24
  if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return true; // 198.51.100.0/24
  if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return true; // 203.0.113.0/24

  // Multicast & Reserved (Class D & E)
  if (parts[0] >= 224 && parts[0] <= 239) return true; // 224.0.0.0/4
  if (parts[0] >= 240) return true; // 240.0.0.0/4

  return false;
}

/**
 * Validates a URL for SSRF vulnerabilities.
 * Throws an error if the URL is invalid or resolves to a restricted IP.
 */
export async function validateUrl(url: string): Promise<void> {
  if (url === undefined || url === null || typeof url !== "string") {
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

  // Resolve hostname, strip square brackets and trailing dots
  let hostname = parsedUrl.hostname;
  if (!hostname) {
    throw new Error("Empty hostname is not allowed.");
  }
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    hostname = hostname.slice(1, -1);
  }
  if (hostname.endsWith(".")) {
    hostname = hostname.slice(0, -1);
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
    // If DNS lookup fails, strictly we should fail for security in high-security contexts.
    // However, sometimes public DNS fails. But allowing it means we might miss a private DNS resolution if the attacker controls DNS.
    // For this context (SSRF prevention), if we can't resolve it to check the IP, we shouldn't let fetch try blindly.
    throw new Error(`Failed to resolve hostname: ${hostname}`);
  }
}
