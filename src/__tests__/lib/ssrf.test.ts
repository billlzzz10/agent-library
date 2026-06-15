import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "../../lib/security";

describe("isPrivateUrl", () => {
  it("should block localhost and loopback addresses", () => {
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://[::1]")).toBe(true);
    expect(isPrivateUrl("https://127.0.0.1:3000")).toBe(true);
  });

  it("should block private IPv4 ranges (RFC 1918)", () => {
    expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
    expect(isPrivateUrl("http://192.168.1.1")).toBe(true);
  });

  it("should block other reserved IPv4 ranges", () => {
    expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
    expect(isPrivateUrl("http://169.254.1.1")).toBe(true); // Link-local
    expect(isPrivateUrl("http://224.0.0.1")).toBe(true); // Multicast
    expect(isPrivateUrl("http://240.0.0.1")).toBe(true); // Reserved
  });

  it("should block internal hostnames", () => {
    expect(isPrivateUrl("http://server.local")).toBe(true);
    expect(isPrivateUrl("http://database.internal")).toBe(true);
    expect(isPrivateUrl("http://test.localhost")).toBe(true);
  });

  it("should block private/reserved IPv6 ranges", () => {
    expect(isPrivateUrl("http://[fe80::1]")).toBe(true); // Link-local
    expect(isPrivateUrl("http://[fc00::1]")).toBe(true); // Unique local
    expect(isPrivateUrl("http://[fd00::1]")).toBe(true); // Unique local
  });

  it("should allow public URLs", () => {
    expect(isPrivateUrl("https://google.com")).toBe(false);
    expect(isPrivateUrl("https://github.com/prompts-chat")).toBe(false);
    expect(isPrivateUrl("https://api.wiro.ai/v1")).toBe(false);
    expect(isPrivateUrl("http://8.8.8.8")).toBe(false);
  });

  it("should return true for invalid URLs", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
    expect(isPrivateUrl("")).toBe(true);
  });
});
