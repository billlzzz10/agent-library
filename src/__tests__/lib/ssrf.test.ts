import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  // Public URLs
  it("should return false for public URLs", () => {
    expect(isPrivateUrl("https://google.com")).toBe(false);
    expect(isPrivateUrl("https://github.com/bl1nk-bot")).toBe(false);
    expect(isPrivateUrl("http://example.com:8080/path?query=1")).toBe(false);
    expect(isPrivateUrl("https://1.1.1.1")).toBe(false);
    expect(isPrivateUrl("https://8.8.8.8")).toBe(false);
  });

  // Localhost and internal hostnames
  it("should return true for localhost and internal hostnames", () => {
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("https://localhost:3000")).toBe(true);
    expect(isPrivateUrl("http://my-service.local")).toBe(true);
    expect(isPrivateUrl("http://internal.service.internal")).toBe(true);
    expect(isPrivateUrl("http://anything.localhost")).toBe(true);
  });

  // IPv4 Private ranges (RFC 1918)
  it("should return true for private IPv4 ranges", () => {
    // 10.0.0.0/8
    expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://10.255.255.254")).toBe(true);

    // 172.16.0.0/12
    expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.31.255.254")).toBe(true);
    expect(isPrivateUrl("http://172.15.255.255")).toBe(false); // Just outside
    expect(isPrivateUrl("http://172.32.0.0")).toBe(false); // Just outside

    // 192.168.0.0/16
    expect(isPrivateUrl("http://192.168.0.1")).toBe(true);
    expect(isPrivateUrl("http://192.168.255.254")).toBe(true);
  });

  // IPv4 Loopback
  it("should return true for IPv4 loopback", () => {
    expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://127.1.2.3")).toBe(true);
  });

  // IPv4 Special ranges
  it("should return true for other special IPv4 ranges", () => {
    // Link-local
    expect(isPrivateUrl("http://169.254.1.1")).toBe(true);

    // CGNAT
    expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
    expect(isPrivateUrl("http://100.127.255.254")).toBe(true);
    expect(isPrivateUrl("http://100.63.255.255")).toBe(false);
    expect(isPrivateUrl("http://100.128.0.0")).toBe(false);

    // Benchmarking
    expect(isPrivateUrl("http://198.18.0.1")).toBe(true);
    expect(isPrivateUrl("http://198.19.255.254")).toBe(true);

    // Multicast
    expect(isPrivateUrl("http://224.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://239.255.255.255")).toBe(true);

    // Reserved
    expect(isPrivateUrl("http://240.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
  });

  // IPv6
  it("should return true for private/reserved IPv6", () => {
    expect(isPrivateUrl("http://[::1]")).toBe(true);
    expect(isPrivateUrl("http://[0:0:0:0:0:0:0:1]")).toBe(true);
    expect(isPrivateUrl("http://[::]")).toBe(true);

    // Link-local
    expect(isPrivateUrl("http://[fe80::1]")).toBe(true);

    // Unique local
    expect(isPrivateUrl("http://[fc00::1]")).toBe(true);
    expect(isPrivateUrl("http://[fdff::ffff]")).toBe(true);

    // Multicast
    expect(isPrivateUrl("http://[ff00::1]")).toBe(true);
  });

  // Invalid URLs
  it("should return true for invalid URLs", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
    expect(isPrivateUrl("http://")).toBe(true);
  });
});
