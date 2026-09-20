import { lookup } from "dns/promises";
import { isIP } from "net";

/**
 * Checks if an IP address is private, loopback, or otherwise restricted.
 */
export function isPrivateIP(ip: string): boolean {
  const cleanIp = ip.startsWith("[") && ip.endsWith("]") ? ip.slice(1, -1) : ip;

  // IPv6 checks
  if (cleanIp === "::1" || cleanIp === "::") return true; // Loopback / Unspecified
  if (cleanIp.startsWith("fe80:")) return true; // IPv6 link-local
  if (cleanIp.startsWith("fc") || cleanIp.startsWith("fd")) return true; // IPv6 private unique local

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
  if (cleanIp.toLowerCase().startsWith("::ffff:")) {
    const mappedPart = cleanIp.slice(7);
    if (isIP(mappedPart) === 4) {
      return isPrivateIP(mappedPart);
    }
  }

  const parts = cleanIp.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false; // Not IPv4
  }

  // IPv4 Private & Restricted Ranges
  if (parts[0] === 10) return true; // 10.0.0.0/8
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
  if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
  if (parts[0] === 127) return true; // 127.0.0.0/8 (Loopback)
  if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.0.0/16 (Link-local)
  if (parts[0] === 0) return true; // 0.0.0.0/8 (Current network)
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true; // 100.64.0.0/10 (Carrier-grade NAT)
  if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true; // 192.0.2.0/24 (TEST-NET-1)
  if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return true; // 198.51.100.0/24 (TEST-NET-2)
  if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return true; // 203.0.113.0/24 (TEST-NET-3)
  if (parts[0] === 198 && parts[1] >= 18 && parts[1] <= 19) return true; // 198.18.0.0/15 (Benchmarking)
  if (parts[0] >= 224) return true; // 224.0.0.0/4 Multicast & 240.0.0.0/4 Reserved

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

  // Resolve hostname
  const rawHostname = parsedUrl.hostname;
  const hostname =
    rawHostname.startsWith("[") && rawHostname.endsWith("]")
      ? rawHostname.slice(1, -1)
      : rawHostname;

  // Skip DNS lookup if hostname is an IP literal and check directly
  if (isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      throw new Error(`Access to restricted IP address ${rawHostname} is forbidden.`);
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
