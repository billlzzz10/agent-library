import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateUrl, isPrivateIP } from "@/lib/security";

const mockLookup = vi.fn();
vi.mock("dns/promises", () => ({
  lookup: (...args: unknown[]) => mockLookup(...args),
  default: {
    lookup: (...args: unknown[]) => mockLookup(...args),
  },
}));

describe("isPrivateIP", () => {
  it("should return true for IPv4 private and restricted ranges", () => {
    expect(isPrivateIP("127.0.0.1")).toBe(true);
    expect(isPrivateIP("10.0.0.1")).toBe(true);
    expect(isPrivateIP("172.16.0.1")).toBe(true);
    expect(isPrivateIP("172.31.255.255")).toBe(true);
    expect(isPrivateIP("192.168.1.1")).toBe(true);
    expect(isPrivateIP("169.254.1.1")).toBe(true);
    expect(isPrivateIP("0.0.0.0")).toBe(true);
    expect(isPrivateIP("100.64.0.1")).toBe(true); // CGNAT
    expect(isPrivateIP("198.18.0.1")).toBe(true); // Benchmarking
    expect(isPrivateIP("192.0.2.1")).toBe(true); // TEST-NET-1
    expect(isPrivateIP("198.51.100.1")).toBe(true); // TEST-NET-2
    expect(isPrivateIP("203.0.113.1")).toBe(true); // TEST-NET-3
    expect(isPrivateIP("224.0.0.1")).toBe(true); // Multicast
  });

  it("should return false for valid public IPv4 addresses", () => {
    expect(isPrivateIP("8.8.8.8")).toBe(false);
    expect(isPrivateIP("1.1.1.1")).toBe(false);
    expect(isPrivateIP("93.184.216.34")).toBe(false);
  });

  it("should return true for IPv6 loopback, link-local, and private unique local", () => {
    expect(isPrivateIP("::1")).toBe(true);
    expect(isPrivateIP("::")).toBe(true);
    expect(isPrivateIP("fe80::1")).toBe(true);
    expect(isPrivateIP("fc00::1")).toBe(true);
    expect(isPrivateIP("fd00::1")).toBe(true);
  });

  it("should return true for IPv4-mapped IPv6 addresses", () => {
    expect(isPrivateIP("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateIP("::ffff:10.0.0.1")).toBe(true);
    expect(isPrivateIP("::ffff:7f00:1")).toBe(true);
  });

  it("should handle edge cases safely", () => {
    expect(isPrivateIP("")).toBe(false);
    expect(isPrivateIP("invalid")).toBe(false);
  });
});

describe("validateUrl", () => {
  beforeEach(() => {
    mockLookup.resetMocks?.() ?? mockLookup.mockReset();
  });

  it("should throw error for invalid or empty URL strings", async () => {
    await expect(validateUrl("")).rejects.toThrow("Invalid URL format");
    await expect(validateUrl("not-a-url")).rejects.toThrow("Invalid URL format");
  });

  it("should throw error for disallowed protocols", async () => {
    await expect(validateUrl("ftp://example.com")).rejects.toThrow(
      "Invalid protocol. Only http and https are allowed."
    );
    await expect(validateUrl("javascript:alert(1)")).rejects.toThrow(
      "Invalid protocol. Only http and https are allowed."
    );
    await expect(validateUrl("file:///etc/passwd")).rejects.toThrow(
      "Invalid protocol. Only http and https are allowed."
    );
  });

  it("should reject private IP literals directly", async () => {
    await expect(validateUrl("http://127.0.0.1")).rejects.toThrow(
      "Access to restricted IP address 127.0.0.1 is forbidden."
    );
    await expect(validateUrl("http://10.0.0.5/api")).rejects.toThrow(
      "Access to restricted IP address 10.0.0.5 is forbidden."
    );
  });

  it("should pass for valid public IP literals and valid public hostnames", async () => {
    await expect(validateUrl("https://8.8.8.8")).resolves.not.toThrow();

    mockLookup.mockResolvedValueOnce({ address: "93.184.216.34", family: 4 });
    await expect(validateUrl("https://example.com")).resolves.not.toThrow();
  });

  it("should resolve domain names and reject if IP resolves to restricted range", async () => {
    mockLookup.mockResolvedValueOnce({ address: "127.0.0.1", family: 4 });
    await expect(validateUrl("https://internal.local")).rejects.toThrow(
      "Access to restricted IP address 127.0.0.1 (resolved from internal.local) is forbidden."
    );
  });

  it("should handle hostnames with trailing dots (FQDN)", async () => {
    mockLookup.mockResolvedValueOnce({ address: "127.0.0.1", family: 4 });
    await expect(validateUrl("https://internal.local.")).rejects.toThrow(
      "Access to restricted IP address 127.0.0.1 (resolved from internal.local) is forbidden."
    );
  });

  it("should throw error when DNS lookup fails", async () => {
    mockLookup.mockRejectedValueOnce(new Error("ENOTFOUND"));
    await expect(validateUrl("https://nonexistent.domain.xyz")).rejects.toThrow(
      "Failed to resolve hostname: nonexistent.domain.xyz"
    );
  });
});
