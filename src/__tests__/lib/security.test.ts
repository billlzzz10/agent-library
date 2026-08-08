import { describe, it, expect } from "vitest";
import { isPrivateIP, validateUrl } from "@/lib/security";

describe("isPrivateIP", () => {
  it("should return true for IPv4 private ranges", () => {
    expect(isPrivateIP("10.0.0.1")).toBe(true);
    expect(isPrivateIP("172.16.0.1")).toBe(true);
    expect(isPrivateIP("172.31.255.255")).toBe(true);
    expect(isPrivateIP("192.168.1.1")).toBe(true);
    expect(isPrivateIP("127.0.0.1")).toBe(true);
    expect(isPrivateIP("169.254.169.254")).toBe(true);
    expect(isPrivateIP("0.0.0.0")).toBe(true);
  });

  it("should return false for public IPv4 addresses", () => {
    expect(isPrivateIP("8.8.8.8")).toBe(false);
    expect(isPrivateIP("1.1.1.1")).toBe(false);
    expect(isPrivateIP("208.67.222.222")).toBe(false);
  });

  it("should return true for private/loopback/restricted IPv6 addresses", () => {
    expect(isPrivateIP("::1")).toBe(true);
    expect(isPrivateIP("::")).toBe(true);
    expect(isPrivateIP("fe80::1")).toBe(true);
    expect(isPrivateIP("fc00::1")).toBe(true);
    expect(isPrivateIP("fd00::1")).toBe(true);
  });

  it("should return true for carrier-grade NAT, benchmark, and test-net IP ranges", () => {
    // Carrier-grade NAT: 100.64.0.0/10
    expect(isPrivateIP("100.64.0.1")).toBe(true);
    expect(isPrivateIP("100.127.255.255")).toBe(true);
    expect(isPrivateIP("100.128.0.0")).toBe(false);

    // Benchmark testing: 198.18.0.0/15
    expect(isPrivateIP("198.18.0.1")).toBe(true);
    expect(isPrivateIP("198.19.255.255")).toBe(true);
    expect(isPrivateIP("198.20.0.0")).toBe(false);

    // Test-net ranges
    expect(isPrivateIP("192.0.2.1")).toBe(true);
    expect(isPrivateIP("198.51.100.12")).toBe(true);
    expect(isPrivateIP("203.0.113.88")).toBe(true);
  });

  it("should return true for IPv4-mapped IPv6 formats (both hex and dotted)", () => {
    // Dotted-decimal IPv4-mapped
    expect(isPrivateIP("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateIP("::ffff:10.0.0.1")).toBe(true);
    expect(isPrivateIP("::ffff:8.8.8.8")).toBe(false);

    // Hex-encoded IPv4-mapped
    expect(isPrivateIP("::ffff:7f00:1")).toBe(true);      // 127.0.0.1
    expect(isPrivateIP("::ffff:7f00:0001")).toBe(true);  // 127.0.0.1
    expect(isPrivateIP("::ffff:0a00:0001")).toBe(true);  // 10.0.0.1
    expect(isPrivateIP("::ffff:0808:0808")).toBe(false); // 8.8.8.8
  });
});

describe("validateUrl", () => {
  it("should throw an error for invalid URL format", async () => {
    await expect(validateUrl("not-a-url")).rejects.toThrow("Invalid URL format");
  });

  it("should throw an error for non-HTTP/HTTPS protocols", async () => {
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

  it("should throw an error for restricted IP literals", async () => {
    await expect(validateUrl("http://127.0.0.1")).rejects.toThrow("Access to restricted IP address");
    await expect(validateUrl("http://[::1]")).rejects.toThrow("Access to restricted IP address");
    await expect(validateUrl("http://[::ffff:7f00:1]")).rejects.toThrow("Access to restricted IP address");
    await expect(validateUrl("http://169.254.169.254")).rejects.toThrow("Access to restricted IP address");
  });

  it("should resolve public hostnames and allow them", async () => {
    // Using a reliable public domain
    await expect(validateUrl("https://example.com")).resolves.not.toThrow();
  });

  it("should handle and reject empty hostnames", async () => {
    await expect(validateUrl("http://")).rejects.toThrow("Invalid URL format");
  });

  it("should strip trailing dots and block localhost.", async () => {
    await expect(validateUrl("http://localhost.")).rejects.toThrow();
    await expect(validateUrl("http://127.0.0.1.")).rejects.toThrow();
  });
});
