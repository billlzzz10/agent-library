import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  it("should allow public URLs", () => {
    expect(isPrivateUrl("https://example.com/image.jpg")).toBe(false);
    expect(isPrivateUrl("https://images.unsplash.com/photo-123")).toBe(false);
    expect(isPrivateUrl("https://8.8.8.8/test")).toBe(false);
  });

  it("should block localhost and loopback", () => {
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://[::1]")).toBe(true);
    expect(isPrivateUrl("http://127.0.1.1")).toBe(true);
  });

  it("should block private IPv4 ranges (RFC 1918)", () => {
    expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
    expect(isPrivateUrl("http://192.168.1.1")).toBe(true);
  });

  it("should block internal/reserved hostnames", () => {
    expect(isPrivateUrl("http://server.local")).toBe(true);
    expect(isPrivateUrl("http://database.internal")).toBe(true);
    expect(isPrivateUrl("http://my.localhost")).toBe(true);
  });

  it("should block link-local and other reserved ranges", () => {
    expect(isPrivateUrl("http://169.254.169.254")).toBe(true); // AWS Metadata
    expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
    expect(isPrivateUrl("http://224.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://240.0.0.1")).toBe(true);
  });

  it("should block private IPv6 ranges", () => {
    expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
    expect(isPrivateUrl("http://[fc00::1]")).toBe(true);
    expect(isPrivateUrl("http://[fd00::1]")).toBe(true);
  });

  it("should block invalid URLs", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
    expect(isPrivateUrl("http://")).toBe(true);
  });
});
