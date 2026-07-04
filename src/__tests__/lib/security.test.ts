import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  it("should block loopback addresses", () => {
    expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("http://[::1]")).toBe(true);
    expect(isPrivateUrl("http://127.1")).toBe(true);
    expect(isPrivateUrl("http://2130706433")).toBe(true);
    expect(isPrivateUrl("http://0x7f.0.0.1")).toBe(true);
  });

  it("should block RFC 1918 private IPv4 ranges", () => {
    expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
    expect(isPrivateUrl("http://192.168.1.1")).toBe(true);
  });

  it("should block CGNAT range", () => {
    expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
    expect(isPrivateUrl("http://100.127.255.255")).toBe(true);
  });

  it("should block benchmarking and test-net ranges", () => {
    expect(isPrivateUrl("http://198.18.0.1")).toBe(true);
    expect(isPrivateUrl("http://198.19.255.255")).toBe(true);
    expect(isPrivateUrl("http://192.0.2.1")).toBe(true);
    expect(isPrivateUrl("http://198.51.100.1")).toBe(true);
    expect(isPrivateUrl("http://203.0.113.1")).toBe(true);
  });

  it("should block link-local and reserved ranges", () => {
    expect(isPrivateUrl("http://169.254.1.1")).toBe(true);
    expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
    expect(isPrivateUrl("http://224.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://240.0.0.1")).toBe(true);
  });

  it("should block internal hostnames", () => {
    expect(isPrivateUrl("http://server.local")).toBe(true);
    expect(isPrivateUrl("http://database.internal")).toBe(true);
    expect(isPrivateUrl("http://anything.localhost")).toBe(true);
  });

  it("should block private/reserved IPv6 ranges", () => {
    expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
    expect(isPrivateUrl("http://[fc00::]")).toBe(true);
    expect(isPrivateUrl("http://[fd00::]")).toBe(true);
  });

  it("should block IPv4-mapped IPv6 for private ranges", () => {
    // These are normalized by new URL() to [::ffff:7f00:1] etc.
    expect(isPrivateUrl("http://[::ffff:127.0.0.1]")).toBe(true);
    expect(isPrivateUrl("http://[::ffff:10.0.0.1]")).toBe(true);
    expect(isPrivateUrl("http://[::ffff:192.168.1.1]")).toBe(true);
    expect(isPrivateUrl("http://[::ffff:a9fe:a9fe]")).toBe(true); // 169.254.169.254
    expect(isPrivateUrl("http://[::ffff:c612:0001]")).toBe(true); // 198.18.0.1
    expect(isPrivateUrl("http://[::ffff:c000:0201]")).toBe(true); // 192.0.2.1
  });

  it("should block non-http/https protocols", () => {
    expect(isPrivateUrl("file:///etc/passwd")).toBe(true);
    expect(isPrivateUrl("ftp://example.com")).toBe(true);
    expect(isPrivateUrl("gopher://example.com")).toBe(true);
  });

  it("should allow public URLs", () => {
    expect(isPrivateUrl("http://google.com")).toBe(false);
    expect(isPrivateUrl("https://github.com/bl1nk-bot")).toBe(false);
    expect(isPrivateUrl("https://8.8.8.8")).toBe(false);
    expect(isPrivateUrl("https://1.1.1.1")).toBe(false);
  });

  it("should handle trailing dots in hostnames", () => {
    expect(isPrivateUrl("http://127.0.0.1.")).toBe(true);
    expect(isPrivateUrl("http://google.com.")).toBe(false);
  });

  it("should return true for invalid URLs", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
    expect(isPrivateUrl("http://")).toBe(true);
  });
});
