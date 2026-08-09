import { describe, it, expect } from "vitest";
import { validateUrl } from "@/lib/security";

describe("validateUrl SSRF protection", () => {
  it("should allow valid public URLs", async () => {
    await expect(validateUrl("https://example.com")).resolves.not.toThrow();
    await expect(validateUrl("http://google.com/search?q=test")).resolves.not.toThrow();
  });

  it("should block non-http/https protocols", async () => {
    await expect(validateUrl("ftp://example.com")).rejects.toThrow("Invalid protocol");
    await expect(validateUrl("file:///etc/passwd")).rejects.toThrow("Invalid protocol");
    await expect(validateUrl("gopher://example.com")).rejects.toThrow("Invalid protocol");
    await expect(validateUrl("javascript:alert(1)")).rejects.toThrow("Invalid protocol");
  });

  it("should block private IPv4 addresses directly", async () => {
    await expect(validateUrl("http://127.0.0.1")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://10.0.0.1")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://172.16.5.5")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://192.168.1.1")).rejects.toThrow("Access to restricted IP");
  });

  it("should block carrier-grade NAT addresses (100.64.0.0/10)", async () => {
    await expect(validateUrl("http://100.64.0.1")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://100.127.255.255")).rejects.toThrow("Access to restricted IP");
  });

  it("should block benchmarking addresses (198.18.0.0/15)", async () => {
    await expect(validateUrl("http://198.18.0.1")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://198.19.255.255")).rejects.toThrow("Access to restricted IP");
  });

  it("should block test-net IP ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24)", async () => {
    await expect(validateUrl("http://192.0.2.1")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://198.51.100.5")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://203.0.113.10")).rejects.toThrow("Access to restricted IP");
  });

  it("should block loopback and wildcard IPv6 addresses", async () => {
    await expect(validateUrl("http://[::1]")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://[::]")).rejects.toThrow("Access to restricted IP");
  });

  it("should block private/link-local IPv6 addresses", async () => {
    await expect(validateUrl("http://[fe80::1]")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://[fc00::1]")).rejects.toThrow("Access to restricted IP");
  });

  it("should block IPv4-mapped IPv6 formats (dotted format)", async () => {
    await expect(validateUrl("http://[::ffff:127.0.0.1]")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://[::ffff:10.0.0.5]")).rejects.toThrow("Access to restricted IP");
  });

  it("should block IPv4-mapped IPv6 formats (hex format normalized by Node v22)", async () => {
    await expect(validateUrl("http://[::ffff:7f00:1]")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://[::ffff:0a00:5]")).rejects.toThrow("Access to restricted IP");
  });

  it("should block FQDN bypasses with trailing dots", async () => {
    await expect(validateUrl("http://127.0.0.1.")).rejects.toThrow("Access to restricted IP");
    // Also tests hostnames resolving to private IPs with trailing dot, but since localhost. is resolved, we handle it
  });
});
