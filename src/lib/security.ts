import { lookup } from "dns/promises";
import { isIP } from "net";

/**
 * Checks if an IP address is private, loopback, or otherwise restricted.
 */
function isPrivateIP(ip: string): boolean {
  let cleanIp = ip.toLowerCase().trim();
  if (cleanIp.startsWith("[") && cleanIp.endsWith("]")) {
    cleanIp = cleanIp.slice(1, -1);
  }

  // IPv6 loopback / unspecified / link-local / unique local
  if (
    cleanIp === "::1" ||
    cleanIp === "::" ||
    cleanIp === "0000:0000:0000:0000:0000:0000:0000:0001" ||
    cleanIp === "0000:0000:0000:0000:0000:0000:0000:0000"
  ) {
    return true;
  }
  if (cleanIp.startsWith("fe80:") || cleanIp.startsWith("fc") || cleanIp.startsWith("fd")) {
    return true;
  }

  // Handle IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (cleanIp.startsWith("::ffff:")) {
    const mapped = cleanIp.slice(7);
    if (mapped.includes(".")) {
      cleanIp = mapped;
    } else if (mapped.includes(":")) {
      const parts = mapped.split(":");
      if (parts.length === 2) {
        const high = parseInt(parts[0], 16);
        const low = parseInt(parts[1], 16);
        if (!isNaN(high) && !isNaN(low)) {
          cleanIp = `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
        }
      }
    }
  }

  const parts = cleanIp.split(".").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false;

  // 10.0.0.0/8 - Private
  if (parts[0] === 10) return true;
  // 172.16.0.0/12 - Private
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16 - Private
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 127.0.0.0/8 - Loopback
  if (parts[0] === 127) return true;
  // 169.254.0.0/16 - Link-local
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 0.0.0.0/8 - Current network
  if (parts[0] === 0) return true;
  // 100.64.0.0/10 - CGNAT
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  // 198.18.0.0/15 - Benchmarking
  if (parts[0] === 198 && parts[1] >= 18 && parts[1] <= 19) return true;
  // TEST-NET (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24)
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

  // Extract raw hostname and strip surrounding brackets for IPv6 literals
  const rawHostname = parsedUrl.hostname;
  const hostname =
    rawHostname.startsWith("[") && rawHostname.endsWith("]")
      ? rawHostname.slice(1, -1)
      : rawHostname;

  if (!hostname) {
    throw new Error("Invalid URL hostname");
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
