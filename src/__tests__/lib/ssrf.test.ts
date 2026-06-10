import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  it("should block localhost and loopback", () => {
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("https://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
    expect(isPrivateUrl("http://[::1]")).toBe(true);
    expect(isPrivateUrl("http://[::]")).toBe(true);
  });

  it("should block private IPv4 ranges", () => {
    expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
    expect(isPrivateUrl("http://192.168.1.1")).toBe(true);
  });

  it("should block link-local and reserved IPv4 ranges", () => {
    expect(isPrivateUrl("http://169.254.0.1")).toBe(true);
    expect(isPrivateUrl("http://100.64.0.1")).toBe(true); // CGNAT
    expect(isPrivateUrl("http://198.18.0.1")).toBe(true); // Benchmarking
    expect(isPrivateUrl("http://224.0.0.1")).toBe(true); // Multicast
    expect(isPrivateUrl("http://240.0.0.1")).toBe(true); // Reserved
  });

  it("should block internal hostnames", () => {
    expect(isPrivateUrl("http://myserver.local")).toBe(true);
    expect(isPrivateUrl("http://api.internal")).toBe(true);
    expect(isPrivateUrl("http://test.localhost")).toBe(true);
  });

  it("should block private IPv6 ranges", () => {
    expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
    expect(isPrivateUrl("http://[fc00::1]")).toBe(true);
    expect(isPrivateUrl("http://[fd00::1]")).toBe(true);
  });

  it("should allow public URLs", () => {
    expect(isPrivateUrl("https://google.com")).toBe(false);
    expect(isPrivateUrl("https://github.com/bl1nk-bot/agent-library")).toBe(false);
    expect(isPrivateUrl("http://8.8.8.8")).toBe(false);
    expect(isPrivateUrl("https://api.wiro.ai/v1/Run")).toBe(false);
  });

  it("should handle invalid URLs as private/dangerous", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
    expect(isPrivateUrl("http://")).toBe(true);
  });
});
