import { describe, expect, it, vi } from "vitest";
import { validateUrl } from "@/lib/security";

vi.mock("dns/promises", () => {
  const lookupFn = vi.fn(async (hostname: string) => {
    if (hostname === "localhost" || hostname === "internal.service") {
      return { address: "127.0.0.1", family: 4 };
    }
    if (hostname === "example.com") {
      return { address: "93.184.216.34", family: 4 };
    }
    throw new Error(`getaddrinfo ENOTFOUND ${hostname}`);
  });

  return {
    lookup: lookupFn,
    default: {
      lookup: lookupFn,
    },
  };
});

describe("validateUrl", () => {
  it("should allow valid public URLs", async () => {
    await expect(validateUrl("https://example.com/api")).resolves.not.toThrow();
    await expect(validateUrl("http://8.8.8.8")).resolves.not.toThrow();
  });

  it("should reject non-http/https protocols", async () => {
    await expect(validateUrl("file:///etc/passwd")).rejects.toThrow(
      "Invalid protocol. Only http and https are allowed."
    );
    await expect(validateUrl("ftp://example.com")).rejects.toThrow(
      "Invalid protocol. Only http and https are allowed."
    );
  });

  it("should reject private IPv4 literals", async () => {
    await expect(validateUrl("http://127.0.0.1")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://10.0.0.1")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://192.168.1.1")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://172.16.0.1")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://169.254.169.254")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://0.0.0.0")).rejects.toThrow("Access to restricted IP");
  });

  it("should reject reserved IPv4 ranges (CGNAT, Benchmarking, Test-Nets)", async () => {
    await expect(validateUrl("http://100.64.0.1")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://198.18.0.1")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://192.0.2.1")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://198.51.100.1")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://203.0.113.1")).rejects.toThrow("Access to restricted IP");
  });

  it("should reject private IPv6 literals (including bracketed syntax)", async () => {
    await expect(validateUrl("http://[::1]")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://[::]")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://[fe80::1]")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://[fc00::1]")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://[fd00::1]")).rejects.toThrow("Access to restricted IP");
  });

  it("should reject IPv4-mapped IPv6 literals", async () => {
    await expect(validateUrl("http://[::ffff:127.0.0.1]")).rejects.toThrow(
      "Access to restricted IP"
    );
    await expect(validateUrl("http://[::ffff:7f00:1]")).rejects.toThrow(
      "Access to restricted IP"
    );
    await expect(validateUrl("http://[::ffff:10.0.0.1]")).rejects.toThrow(
      "Access to restricted IP"
    );
  });

  it("should reject trailing dot FQDN bypasses for restricted IPs", async () => {
    await expect(validateUrl("http://127.0.0.1.")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://localhost.")).rejects.toThrow("Access to restricted IP");
  });

  it("should reject hostnames that resolve to private IPs", async () => {
    await expect(validateUrl("http://localhost")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://internal.service")).rejects.toThrow(
      "Access to restricted IP"
    );
  });
});
