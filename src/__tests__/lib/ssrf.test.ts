import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  it("should return true for null or undefined", () => {
    expect(isPrivateUrl(null)).toBe(true);
    expect(isPrivateUrl(undefined)).toBe(true);
  });

  it("should return true for invalid URLs", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
    expect(isPrivateUrl("http://")).toBe(true);
  });

  it("should return true for localhost and loopback", () => {
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://127.0.1.1")).toBe(true);
    expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
    expect(isPrivateUrl("http://[::1]")).toBe(true);
    expect(isPrivateUrl("http://[::]")).toBe(true);
  });

  it("should return true for private IPv4 ranges (RFC 1918)", () => {
    // 10.0.0.0/8
    expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://10.255.255.255")).toBe(true);

    // 172.16.0.0/12
    expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.31.255.255")).toBe(true);

    // 192.168.0.0/16
    expect(isPrivateUrl("http://192.168.1.1")).toBe(true);
    expect(isPrivateUrl("http://192.168.255.254")).toBe(true);
  });

  it("should return true for other reserved IPv4 ranges", () => {
    // CGNAT 100.64.0.0/10
    expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
    expect(isPrivateUrl("http://100.127.255.255")).toBe(true);

    // Link-local 169.254.0.0/16
    expect(isPrivateUrl("http://169.254.1.1")).toBe(true);

    // Benchmarking 198.18.0.0/15
    expect(isPrivateUrl("http://198.18.0.1")).toBe(true);
    expect(isPrivateUrl("http://198.19.255.255")).toBe(true);

    // Multicast 224.0.0.0/4
    expect(isPrivateUrl("http://224.0.0.1")).toBe(true);

    // Reserved 240.0.0.0/4
    expect(isPrivateUrl("http://240.0.0.1")).toBe(true);
  });

  it("should return true for internal hostnames", () => {
    expect(isPrivateUrl("http://my-service.local")).toBe(true);
    expect(isPrivateUrl("http://database.internal")).toBe(true);
    expect(isPrivateUrl("http://test.localhost")).toBe(true);
  });

  it("should return true for private/reserved IPv6 ranges", () => {
    expect(isPrivateUrl("http://[fe80::1]")).toBe(true); // Link-local
    expect(isPrivateUrl("http://[fc00::1]")).toBe(true); // Unique local
    expect(isPrivateUrl("http://[fd00::1]")).toBe(true); // Unique local
    expect(isPrivateUrl("http://[ff02::1]")).toBe(true); // Multicast
  });

  it("should return false for public URLs", () => {
    expect(isPrivateUrl("https://google.com")).toBe(false);
    expect(isPrivateUrl("https://github.com/bl1nk-bot")).toBe(false);
    expect(isPrivateUrl("https://8.8.8.8")).toBe(false);
    expect(isPrivateUrl("https://[2001:4860:4860::8888]")).toBe(false);
  });
});
