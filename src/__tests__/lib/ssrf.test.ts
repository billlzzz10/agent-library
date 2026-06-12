import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  it("should allow public URLs", () => {
    expect(isPrivateUrl("https://google.com")).toBe(false);
    expect(isPrivateUrl("https://api.github.com/users/octocat")).toBe(false);
    expect(isPrivateUrl("https://images.unsplash.com/photo-123")).toBe(false);
  });

  it("should block localhost and loopback", () => {
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("http://localhost:3000")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1:8080")).toBe(true);
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
    expect(isPrivateUrl("http://172.32.0.1")).toBe(false);

    // 192.168.0.0/16
    expect(isPrivateUrl("http://192.168.0.1")).toBe(true);
    expect(isPrivateUrl("http://192.168.255.255")).toBe(true);
  });

  it("should block other reserved IPv4 ranges", () => {
    // Link-local
    expect(isPrivateUrl("http://169.254.0.1")).toBe(true);

    // Carrier-grade NAT
    expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
    expect(isPrivateUrl("http://100.127.255.255")).toBe(true);

    // Multicast
    expect(isPrivateUrl("http://224.0.0.1")).toBe(true);

    // Reserved
    expect(isPrivateUrl("http://240.0.0.1")).toBe(true);
  });

  it("should block internal hostnames", () => {
    expect(isPrivateUrl("http://my-service.local")).toBe(true);
    expect(isPrivateUrl("http://internal-api.internal")).toBe(true);
    expect(isPrivateUrl("http://test.localhost")).toBe(true);
  });

  it("should block private/reserved IPv6 ranges", () => {
    expect(isPrivateUrl("http://[::]")).toBe(true);
    expect(isPrivateUrl("http://[fe80::1234]")).toBe(true);
    expect(isPrivateUrl("http://[fc00::1]")).toBe(true);
    expect(isPrivateUrl("http://[fd00::1]")).toBe(true);
  });

  it("should block invalid URLs", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
    expect(isPrivateUrl("http://")).toBe(true);
  });
});
