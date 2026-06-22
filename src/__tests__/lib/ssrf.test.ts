import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  it("should allow public URLs", () => {
    expect(isPrivateUrl("https://google.com")).toBe(false);
    expect(isPrivateUrl("http://example.com/path?query=1")).toBe(false);
    expect(isPrivateUrl("https://github.com/bl1nk-bot/agent-library")).toBe(false);
  });

  it("should block non-http/https protocols", () => {
    expect(isPrivateUrl("file:///etc/passwd")).toBe(true);
    expect(isPrivateUrl("ftp://example.com")).toBe(true);
    expect(isPrivateUrl("javascript:alert(1)")).toBe(true);
    expect(isPrivateUrl("gopher://example.com")).toBe(true);
  });

  it("should block localhost and loopback", () => {
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("https://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.2")).toBe(true);
    expect(isPrivateUrl("http://127.255.255.255")).toBe(true);
    expect(isPrivateUrl("http://[::1]")).toBe(true);
    expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
  });

  it("should block private IPv4 ranges (RFC 1918)", () => {
    // 10.0.0.0/8
    expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://10.255.255.255")).toBe(true);

    // 172.16.0.0/12
    expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
    expect(isPrivateUrl("http://172.15.255.255")).toBe(false); // Just outside
    expect(isPrivateUrl("http://172.32.0.0")).toBe(false); // Just outside

    // 192.168.0.0/16
    expect(isPrivateUrl("http://192.168.0.1")).toBe(true);
    expect(isPrivateUrl("http://192.168.255.255")).toBe(true);
  });

  it("should block CGNAT range (100.64.0.0/10)", () => {
    expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
    expect(isPrivateUrl("http://100.127.255.255")).toBe(true);
    expect(isPrivateUrl("http://100.63.255.255")).toBe(false);
    expect(isPrivateUrl("http://100.128.0.0")).toBe(false);
  });

  it("should block Link-local range (169.254.0.0/16)", () => {
    expect(isPrivateUrl("http://169.254.0.1")).toBe(true);
    expect(isPrivateUrl("http://169.254.255.255")).toBe(true);
  });

  it("should block benchmarking range (198.18.0.0/15)", () => {
    expect(isPrivateUrl("http://198.18.0.1")).toBe(true);
    expect(isPrivateUrl("http://198.19.255.255")).toBe(true);
    expect(isPrivateUrl("http://198.17.255.255")).toBe(false);
    expect(isPrivateUrl("http://198.20.0.0")).toBe(false);
  });

  it("should block internal hostnames", () => {
    expect(isPrivateUrl("http://my-server.local")).toBe(true);
    expect(isPrivateUrl("http://database.internal")).toBe(true);
    expect(isPrivateUrl("http://test.localhost")).toBe(true);
    expect(isPrivateUrl("http://router.lan")).toBe(true);
  });

  it("should block reserved/multicast ranges", () => {
    expect(isPrivateUrl("http://224.0.0.1")).toBe(true); // Multicast
    expect(isPrivateUrl("http://240.0.0.1")).toBe(true); // Reserved
    expect(isPrivateUrl("http://255.255.255.255")).toBe(true); // Broadcast
  });

  it("should block private/reserved IPv6 ranges", () => {
    expect(isPrivateUrl("http://[fe80::1]")).toBe(true); // Link-local
    expect(isPrivateUrl("http://[fc00::1]")).toBe(true); // Unique-local
    expect(isPrivateUrl("http://[fd00::1]")).toBe(true); // Unique-local
    expect(isPrivateUrl("http://[::]")).toBe(true); // Unspecified
  });

  it("should handle trailing dots in hostname", () => {
    expect(isPrivateUrl("https://google.com.")).toBe(false);
    expect(isPrivateUrl("http://127.0.0.1.")).toBe(true);
    expect(isPrivateUrl("http://localhost.")).toBe(true);
  });

  it("should block invalid URLs", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
    expect(isPrivateUrl("http://[invalid-ipv6]")).toBe(true);
    expect(isPrivateUrl("http://256.256.256.256")).toBe(true);
  });
});
