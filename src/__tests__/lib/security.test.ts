import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateUrl } from "@/lib/security";
import { lookup } from "dns/promises";

vi.mock("dns/promises", () => {
  const lookupFn = vi.fn();
  return {
    lookup: lookupFn,
    default: {
      lookup: lookupFn,
    },
  };
});

describe("validateUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow valid public HTTP/HTTPS URLs with public IP resolution", async () => {
    vi.mocked(lookup).mockResolvedValue({ address: "93.184.216.34", family: 4 });

    await expect(validateUrl("https://example.com")).resolves.not.toThrow();
    await expect(validateUrl("http://example.com/path?query=1")).resolves.not.toThrow();
  });

  it("should throw error for malformed URL format", async () => {
    await expect(validateUrl("invalid-url")).rejects.toThrow("Invalid URL format");
    await expect(validateUrl("http://")).rejects.toThrow("Invalid URL format");
  });

  it("should throw error for non-HTTP/HTTPS protocols", async () => {
    await expect(validateUrl("ftp://example.com")).rejects.toThrow(
      "Invalid protocol. Only http and https are allowed."
    );
    await expect(validateUrl("file:///etc/passwd")).rejects.toThrow(
      "Invalid protocol. Only http and https are allowed."
    );
    await expect(validateUrl("gopher://example.com")).rejects.toThrow(
      "Invalid protocol. Only http and https are allowed."
    );
  });

  it("should block private/restricted IPv4 literal addresses", async () => {
    await expect(validateUrl("http://127.0.0.1")).rejects.toThrow(
      "Access to restricted IP address 127.0.0.1 is forbidden."
    );
    await expect(validateUrl("http://10.0.0.1")).rejects.toThrow(
      "Access to restricted IP address 10.0.0.1 is forbidden."
    );
    await expect(validateUrl("http://172.16.0.1")).rejects.toThrow(
      "Access to restricted IP address 172.16.0.1 is forbidden."
    );
    await expect(validateUrl("http://192.168.1.1")).rejects.toThrow(
      "Access to restricted IP address 192.168.1.1 is forbidden."
    );
    await expect(validateUrl("http://169.254.169.254")).rejects.toThrow(
      "Access to restricted IP address 169.254.169.254 is forbidden."
    );
    await expect(validateUrl("http://0.0.0.0")).rejects.toThrow(
      "Access to restricted IP address 0.0.0.0 is forbidden."
    );
  });

  it("should allow public IPv4 literal addresses without DNS lookup", async () => {
    await expect(validateUrl("http://8.8.8.8")).resolves.not.toThrow();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("should block private/restricted IPv6 literal addresses", async () => {
    await expect(validateUrl("http://[::1]")).rejects.toThrow();
    await expect(validateUrl("http://[fe80::1]")).rejects.toThrow();
    await expect(validateUrl("http://[fc00::1]")).rejects.toThrow();
    await expect(validateUrl("http://[fd00::1]")).rejects.toThrow();
  });

  it("should block hostnames that resolve to private IP addresses", async () => {
    vi.mocked(lookup).mockResolvedValue({ address: "127.0.0.1", family: 4 });

    await expect(validateUrl("https://internal.local")).rejects.toThrow(
      "Access to restricted IP address 127.0.0.1 (resolved from internal.local) is forbidden."
    );
  });

  it("should throw error when DNS lookup fails", async () => {
    vi.mocked(lookup).mockRejectedValue(new Error("ENOTFOUND"));

    await expect(validateUrl("https://nonexistent.domain.example")).rejects.toThrow(
      "Failed to resolve hostname: nonexistent.domain.example"
    );
  });
});
