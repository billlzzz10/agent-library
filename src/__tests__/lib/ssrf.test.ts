import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  it("should block localhost and loopback", () => {
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.2")).toBe(true);
    expect(isPrivateUrl("http://[::1]")).toBe(true);
    expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
    expect(isPrivateUrl("http://[::]")).toBe(true);
  });

  it("should block private RFC1918 addresses", () => {
    expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
    expect(isPrivateUrl("http://192.168.1.1")).toBe(true);
  });

  it("should block link-local addresses", () => {
    expect(isPrivateUrl("http://169.254.169.254")).toBe(true);
    expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
  });

  it("should block CGNAT addresses", () => {
    expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
    expect(isPrivateUrl("http://100.127.255.255")).toBe(true);
  });

  it("should block internal hostnames", () => {
    expect(isPrivateUrl("http://my-service.local")).toBe(true);
    expect(isPrivateUrl("http://database.internal")).toBe(true);
    expect(isPrivateUrl("http://api.localhost")).toBe(true);
  });

  it("should block encoded IP addresses that resolve to loopback", () => {
    expect(isPrivateUrl("http://0x7f000001")).toBe(true); // 127.0.0.1 in hex
    expect(isPrivateUrl("http://2130706433")).toBe(true); // 127.0.0.1 in decimal
    expect(isPrivateUrl("http://017700000001")).toBe(true); // 127.0.0.1 in octal
  });

  it("should allow public URLs", () => {
    expect(isPrivateUrl("https://google.com")).toBe(false);
    expect(isPrivateUrl("https://github.com/bl1nk-bot/agent-library")).toBe(false);
    expect(isPrivateUrl("https://8.8.8.8")).toBe(false);
  });

  it("should handle invalid URLs by blocking them", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
    expect(isPrivateUrl("")).toBe(false); // empty string handled explicitly
  });
});
