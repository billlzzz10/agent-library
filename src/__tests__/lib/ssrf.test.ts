import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  it("should block localhost and loopback", () => {
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://127.1.2.3")).toBe(true);
    expect(isPrivateUrl("http://[::1]")).toBe(true);
    expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
    expect(isPrivateUrl("http://[::]")).toBe(true);
  });

  it("should block private RFC1918 ranges", () => {
    // 10.0.0.0/8
    expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
    expect(isPrivateUrl("https://10.255.255.254/api")).toBe(true);

    // 172.16.0.0/12
    expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.31.255.255")).toBe(true);

    // 192.168.0.0/16
    expect(isPrivateUrl("http://192.168.1.1")).toBe(true);
    expect(isPrivateUrl("http://192.168.100.200")).toBe(true);
  });

  it("should block internal and link-local ranges", () => {
    // 169.254.0.0/16
    expect(isPrivateUrl("http://169.254.169.254")).toBe(true);

    // CGNAT 100.64.0.0/10
    expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
    expect(isPrivateUrl("http://100.127.255.255")).toBe(true);

    // Internal hostnames
    expect(isPrivateUrl("http://myservice.local")).toBe(true);
    expect(isPrivateUrl("http://database.internal")).toBe(true);
    expect(isPrivateUrl("http://api.localhost")).toBe(true);
  });

  it("should block IPv6 internal ranges", () => {
    expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
    expect(isPrivateUrl("http://[fc00::]")).toBe(true);
    expect(isPrivateUrl("http://[fd00::]")).toBe(true);
    expect(isPrivateUrl("http://[ff02::1]")).toBe(true);
  });

  it("should allow public URLs", () => {
    expect(isPrivateUrl("https://google.com")).toBe(false);
    expect(isPrivateUrl("https://github.com/bl1nk-bot/agent-library")).toBe(false);
    expect(isPrivateUrl("http://8.8.8.8")).toBe(false);
    expect(isPrivateUrl("https://api.wiro.ai/v1")).toBe(false);
  });

  it("should handle invalid URLs", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
    expect(isPrivateUrl("http://[invalid-ipv6]")).toBe(true);
  });

  it("should handle null or undefined", () => {
    expect(isPrivateUrl(null)).toBe(false);
    expect(isPrivateUrl(undefined)).toBe(false);
    expect(isPrivateUrl("")).toBe(false);
  });
});
