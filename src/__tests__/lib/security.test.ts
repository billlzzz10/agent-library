import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateUrl } from "@/lib/security";

// Mock dns/promises cleanly with both named and default exports
vi.mock("dns/promises", () => {
  const lookup = vi.fn(async (hostname: string) => {
    if (hostname === "localhost" || hostname === "localhost.") {
      return { address: "127.0.0.1" };
    }
    if (hostname === "internal.example.com") {
      return { address: "10.0.0.1" };
    }
    if (hostname === "cgnat.example.com") {
      return { address: "100.64.0.1" };
    }
    if (hostname === "testnet.example.com") {
      return { address: "192.0.2.1" };
    }
    if (hostname === "multicast.example.com") {
      return { address: "224.0.0.1" };
    }
    if (hostname === "malicious.com" || hostname === "malicious.com.") {
      return { address: "127.0.0.1" };
    }
    if (hostname === "ipv6-private.com") {
      return { address: "fc00::1" };
    }
    if (hostname === "ipv6-loopback.com") {
      return { address: "::1" };
    }
    if (hostname === "google.com") {
      return { address: "142.250.190.46" };
    }
    throw new Error("ENOTFOUND");
  });

  return {
    lookup,
    default: {
      lookup,
    },
  };
});

describe("validateUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Input validation edge cases", () => {
    it("should throw error for null, undefined, or empty URLs", async () => {
      await expect(validateUrl(null as any)).rejects.toThrow("Invalid URL format");
      await expect(validateUrl(undefined as any)).rejects.toThrow("Invalid URL format");
      await expect(validateUrl("")).rejects.toThrow("Invalid URL format");
    });

    it("should throw error for invalid URL strings", async () => {
      await expect(validateUrl("not-a-url")).rejects.toThrow("Invalid URL format");
      await expect(validateUrl("http://")).rejects.toThrow("Invalid URL format");
    });

    it("should throw error for unsupported protocols", async () => {
      await expect(validateUrl("ftp://google.com")).rejects.toThrow(
        "Invalid protocol. Only http and https are allowed."
      );
      await expect(validateUrl("file:///etc/passwd")).rejects.toThrow(
        "Invalid protocol. Only http and https are allowed."
      );
      await expect(validateUrl("gopher://google.com")).rejects.toThrow(
        "Invalid protocol. Only http and https are allowed."
      );
    });
  });

  describe("IP check directly (when hostname is IP literal)", () => {
    it("should block private/restricted IPv4 literals", async () => {
      const privateIps = [
        "127.0.0.1",
        "10.0.0.1",
        "172.16.0.1",
        "192.168.1.1",
        "169.254.169.254",
        "0.0.0.0",
        "100.64.0.5", // CGNAT
        "198.18.0.9", // Benchmark
        "192.0.2.100", // Test-net
        "198.51.100.5", // Test-net
        "203.0.113.1", // Test-net
        "224.0.0.1", // Multicast
        "255.255.255.255", // Reserved
      ];

      for (const ip of privateIps) {
        await expect(validateUrl(`http://${ip}`)).rejects.toThrow(
          `Access to restricted IP address ${ip} is forbidden.`
        );
      }
    });

    it("should block private/restricted IPv6 literals", async () => {
      const privateIps = [
        "[::1]",
        "[::]",
        "[fe80::1]",
        "[fc00::1]",
        "[fd00::9]",
      ];

      for (const ip of privateIps) {
        await expect(validateUrl(`http://${ip}`)).rejects.toThrow("Access to restricted IP address");
      }
    });

    it("should allow public IP literals", async () => {
      await expect(validateUrl("http://8.8.8.8")).resolves.not.toThrow();
      await expect(validateUrl("https://1.1.1.1")).resolves.not.toThrow();
    });

    it("should handle IPv4-mapped IPv6 formats correctly", async () => {
      await expect(validateUrl("http://[::ffff:127.0.0.1]")).rejects.toThrow(
        "Access to restricted IP address"
      );
      await expect(validateUrl("http://[::ffff:7f00:1]")).rejects.toThrow(
        "Access to restricted IP address"
      );
      await expect(validateUrl("http://[::ffff:0a00:0001]")).rejects.toThrow(
        "Access to restricted IP address"
      );
    });
  });

  describe("DNS Resolution and bypass prevention", () => {
    it("should resolve hostname and block if it points to a private/restricted IP", async () => {
      await expect(validateUrl("http://malicious.com")).rejects.toThrow(
        "Access to restricted IP address 127.0.0.1 (resolved from malicious.com) is forbidden."
      );
      await expect(validateUrl("https://internal.example.com")).rejects.toThrow(
        "Access to restricted IP address 10.0.0.1"
      );
      await expect(validateUrl("https://cgnat.example.com")).rejects.toThrow(
        "Access to restricted IP address 100.64.0.1"
      );
      await expect(validateUrl("https://testnet.example.com")).rejects.toThrow(
        "Access to restricted IP address 192.0.2.1"
      );
    });

    it("should allow hostname that resolves to a public IP", async () => {
      await expect(validateUrl("http://google.com")).resolves.not.toThrow();
    });

    it("should strip trailing dots to prevent FQDN SSRF bypasses", async () => {
      await expect(validateUrl("http://malicious.com.")).rejects.toThrow(
        "Access to restricted IP address"
      );
    });

    it("should throw error if DNS resolution fails", async () => {
      await expect(validateUrl("http://doesnotexist.example.com")).rejects.toThrow(
        "Failed to resolve hostname: doesnotexist.example.com"
      );
    });
  });
});
