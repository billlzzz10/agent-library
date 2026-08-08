import { lookup } from "dns/promises";
import { isIP } from "net";

/**
 * Checks if an IP address is private, loopback, or otherwise restricted.
 */
export function isPrivateIP(ip: string): boolean {
  const lowerIp = ip.toLowerCase();

  // IPv6 loopback, unspecified, link-local, and private unique local
  if (lowerIp === "::1" || lowerIp === "::" || lowerIp === "0:0:0:0:0:0:0:0") return true;
  if (lowerIp.startsWith("fe80:")) return true;
  if (lowerIp.startsWith("fc") || lowerIp.startsWith("fd")) return true;

  // Check for IPv4-mapped IPv6 formats
  if (lowerIp.startsWith("::ffff:")) {
    const mapped = lowerIp.slice(7);
    if (mapped.includes(".")) {
      // Dotted-decimal format: "::ffff:127.0.0.1"
      return isPrivateIP(mapped);
    } else {
      // Hex format: "::ffff:7f00:1" or "::ffff:7f00:0001"
      const hexSegments = mapped.split(":");
      if (hexSegments.length === 2) {
        // Pad both segments to 4 characters
        const seg0 = hexSegments[0].padStart(4, "0");
        const seg1 = hexSegments[1].padStart(4, "0");

        // Extract 4 octets
        const octet0 = parseInt(seg0.slice(0, 2), 16);
        const octet1 = parseInt(seg0.slice(2, 4), 16);
        const octet2 = parseInt(seg1.slice(0, 2), 16);
        const octet3 = parseInt(seg1.slice(2, 4), 16);

        if (!isNaN(octet0) && !isNaN(octet1) && !isNaN(octet2) && !isNaN(octet3)) {
          const ipv4 = `${octet0}.${octet1}.${octet2}.${octet3}`;
          return isPrivateIP(ipv4);
        }
      }
    }
  }

  const parts = ip.split(".").map(Number);
  if (parts.length !== 4) return false; // Not IPv4 (or invalid format handled by isIP check before)

  // Standard private/loopback/unspecified ranges:
  // 10.0.0.0/8      -> 10.x.x.x
  // 172.16.0.0/12   -> 172.16.x.x - 172.31.x.x
  // 192.168.0.0/16  -> 192.168.x.x
  // 127.0.0.0/8     -> 127.x.x.x (Loopback)
  // 169.254.0.0/16  -> 169.254.x.x (Link-local)
  // 0.0.0.0/8       -> 0.x.x.x (Current network)
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 0) return true;

  // Carrier-grade NAT: 100.64.0.0/10 (100.64.0.0 to 100.127.255.255)
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;

  // Benchmark testing: 198.18.0.0/15 (198.18.0.0 to 198.19.255.255)
  if (parts[0] === 198 && parts[1] >= 18 && parts[1] <= 19) return true;

  // Test-net 1: 192.0.2.0/24
  if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true;

  // Test-net 2: 198.51.100.0/24
  if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return true;

  // Test-net 3: 203.0.113.0/24
  if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return true;

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

  // Resolve and normalize hostname
  let hostname = parsedUrl.hostname;

  // Strip brackets for IPv6
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    hostname = hostname.slice(1, -1);
  }

  // Strip trailing dots for FQDN bypasses
  if (hostname.endsWith(".")) {
    hostname = hostname.slice(0, -1);
  }

  if (!hostname) {
    throw new Error("Invalid hostname");
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
    throw new Error(`Failed to resolve hostname: ${hostname}`);
  }
}
