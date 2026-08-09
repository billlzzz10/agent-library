import { lookup } from "dns/promises";
import { isIP } from "net";

/**
 * Checks if an IP address is private, loopback, or otherwise restricted.
 */
function isPrivateIP(ip: string): boolean {
  // Normalize IPv4-mapped IPv6 hex format (e.g., ::ffff:7f00:1) to standard IPv4 decimal string
  let ipToCheck = ip;
  if (ip.toLowerCase().startsWith("::ffff:")) {
    const rest = ip.slice(7);
    if (rest.includes(".")) {
      ipToCheck = rest;
    } else {
      const blocks = rest.split(":");
      if (blocks.length === 2) {
        const block1 = blocks[0].padStart(4, "0");
        const block2 = blocks[1].padStart(4, "0");
        const o1 = parseInt(block1.slice(0, 2), 16);
        const o2 = parseInt(block1.slice(2, 4), 16);
        const o3 = parseInt(block2.slice(0, 2), 16);
        const o4 = parseInt(block2.slice(2, 4), 16);
        if (!isNaN(o1) && !isNaN(o2) && !isNaN(o3) && !isNaN(o4)) {
          ipToCheck = `${o1}.${o2}.${o3}.${o4}`;
        }
      }
    }
  }

  // IPv6 specific checks
  if (ipToCheck === "::1" || ipToCheck === "::") return true; // loopback & wildcard
  if (ipToCheck.toLowerCase().startsWith("fe80:")) return true; // link-local
  if (ipToCheck.toLowerCase().startsWith("fc") || ipToCheck.toLowerCase().startsWith("fd")) return true; // private unique local

  const parts = ipToCheck.split(".").map(Number);
  if (parts.length !== 4) return false;

  // RFC 1918 Private ranges
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;

  // RFC 5735 / RFC 1122 / Other Reserved
  if (parts[0] === 127) return true; // Loopback
  if (parts[0] === 169 && parts[1] === 254) return true; // Link-local
  if (parts[0] === 0) return true; // Current network

  // Carrier-Grade NAT (RFC 6598)
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;

  // Benchmarking (RFC 2544)
  if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) return true;

  // Test-net ranges (RFC 5737)
  if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true; // Test-net 1
  if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return true; // Test-net 2
  if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return true; // Test-net 3

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

  // Strip trailing dots from hostname to prevent FQDN-based SSRF bypasses
  let hostname = parsedUrl.hostname;
  while (hostname.endsWith(".")) {
    hostname = hostname.slice(0, -1);
  }

  // Strip brackets for IPv6 check
  const ipOrHost = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;

  // Skip DNS lookup if hostname is an IP literal and check directly
  if (isIP(ipOrHost)) {
    if (isPrivateIP(ipOrHost)) {
      throw new Error(`Access to restricted IP address ${ipOrHost} is forbidden.`);
    }
    return;
  }

  try {
    const { address } = await lookup(ipOrHost);
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
