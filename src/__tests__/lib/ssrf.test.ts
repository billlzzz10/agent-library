import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "../../lib/security";

describe("isPrivateUrl", () => {
  it("should return true for loopback addresses", () => {
    expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("http://[::1]")).toBe(true);
    expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
    expect(isPrivateUrl("http://[::]")).toBe(true);
  });

  it("should return true for private IPv4 ranges (RFC 1918)", () => {
    // 10.0.0.0/8
    expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://10.255.255.254")).toBe(true);

    // 172.16.0.0/12
    expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.31.255.254")).toBe(true);

    // 192.168.0.0/16
    expect(isPrivateUrl("http://192.168.0.1")).toBe(true);
    expect(isPrivateUrl("http://192.168.1.1")).toBe(true);
  });

  it("should return true for other reserved IPv4 ranges", () => {
    // CGNAT (100.64.0.0/10)
    expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
    expect(isPrivateUrl("http://100.127.255.254")).toBe(true);

    // Link-local (169.254.0.0/16)
    expect(isPrivateUrl("http://169.254.0.1")).toBe(true);

    // Benchmarking (198.18.0.0/15)
    expect(isPrivateUrl("http://198.18.0.1")).toBe(true);
    expect(isPrivateUrl("http://198.19.255.254")).toBe(true);

    // Multicast (224.0.0.0/4)
    expect(isPrivateUrl("http://224.0.0.1")).toBe(true);

    // Reserved (240.0.0.0/4)
    expect(isPrivateUrl("http://241.0.0.1")).toBe(true);
  });

  it("should return true for internal hostnames", () => {
    expect(isPrivateUrl("http://server.local")).toBe(true);
    expect(isPrivateUrl("http://database.internal")).toBe(true);
    expect(isPrivateUrl("http://api.localhost")).toBe(true);
    expect(isPrivateUrl("http://router.lan")).toBe(true);
    expect(isPrivateUrl("http://my.home.arpa")).toBe(true);
  });

  it("should return true for private/reserved IPv6 ranges", () => {
    expect(isPrivateUrl("http://[fe80::1]")).toBe(true); // Link-local
    expect(isPrivateUrl("http://[fc00::1]")).toBe(true); // ULA
    expect(isPrivateUrl("http://[fd00::1]")).toBe(true); // ULA
    expect(isPrivateUrl("http://[ff02::1]")).toBe(true); // Multicast
  });

  it("should return false for public URLs", () => {
    expect(isPrivateUrl("https://google.com")).toBe(false);
    expect(isPrivateUrl("https://8.8.8.8")).toBe(false);
    expect(isPrivateUrl("https://prompts.chat")).toBe(false);
    expect(isPrivateUrl("https://github.com/bl1nk-bot/agent-library")).toBe(false);
  });

  it("should return true for invalid URLs", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
    expect(isPrivateUrl("http://[invalid-ipv6]")).toBe(true);
  });

  it("should handle mixed case", () => {
    expect(isPrivateUrl("http://LOCALHOST")).toBe(true);
  });

  it("should handle trailing dots in hostname by blocking them if they resolve to private", () => {
    // If the URL parser strips the trailing dot, it should still be caught
    const privateWithDot = "http://127.0.0.1.";
    expect(isPrivateUrl(privateWithDot)).toBe(true);
  });
});
