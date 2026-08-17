import { lookup } from "dns/promises";
import { isIP } from "net";

/**
 * Checks if an IP address is private, loopback, or otherwise restricted.
 */
function isPrivateIP(ip: string): boolean {
  if (ip === "::1" || ip === "::") return true; // IPv6 loopback / unspecified
  if (ip.startsWith("fe80:")) return true; // IPv6 link-local
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // IPv6 private unique local

  // Handle IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (ip.includes(":")) {
    const lower = ip.toLowerCase();
    if (lower.startsWith("::ffff:")) {
      const mapped = lower.substring(7);
      if (mapped.includes(".")) {
        return isPrivateIP(mapped);
      }
      // Hex representation like 7f00:1 -> 127.0.0.1
      const parts = mapped.split(":");
      if (parts.length === 2) {
        const h1 = parseInt(parts[0], 16);
        const h2 = parseInt(parts[1], 16);
        if (!isNaN(h1) && !isNaN(h2)) {
          const octet1 = (h1 >> 8) & 0xff;
          const octet2 = h1 & 0xff;
          const octet3 = (h2 >> 8) & 0xff;
          const octet4 = h2 & 0xff;
          return isPrivateIP(`${octet1}.${octet2}.${octet3}.${octet4}`);
        }
      }
    }
    return false;
  }

  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return false;

  // 10.0.0.0/8 (Private)
  if (parts[0] === 10) return true;
  // 172.16.0.0/12 (Private)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 127.0.0.0/8 (Loopback)
  if (parts[0] === 127) return true;
  // 169.254.0.0/16 (Link-local)
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 0.0.0.0/8 (Current network)
  if (parts[0] === 0) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  // 198.18.0.0/15 (Benchmarking)
  if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) return true;
  // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (TEST-NETs)
  if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true;
  if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return true;
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

  // Resolve hostname (strip brackets for IPv6 and trailing dot for FQDN)
  const hostname = parsedUrl.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");

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
    // However, sometimes public DNS fails. But allowing it means we might miss a private DNS resolution if the attacker controls DNS.
    // For this context (SSRF prevention), if we can't resolve it to check the IP, we shouldn't let fetch try blindly.
    throw new Error(`Failed to resolve hostname: ${hostname}`);
  }
}
