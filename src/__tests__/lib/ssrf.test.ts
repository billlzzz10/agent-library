import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/webhook";

describe("isPrivateUrl", () => {
  it("should allow public URLs", () => {
    expect(isPrivateUrl("https://google.com")).toBe(false);
    expect(isPrivateUrl("http://example.com/path?q=1")).toBe(false);
    expect(isPrivateUrl("https://github.com/lucide-react")).toBe(false);
  });

  it("should block non-http/https protocols", () => {
    expect(isPrivateUrl("ftp://example.com")).toBe(true);
    expect(isPrivateUrl("file:///etc/passwd")).toBe(true);
    expect(isPrivateUrl("gopher://example.com")).toBe(true);
    expect(isPrivateUrl("javascript:alert(1)")).toBe(true);
  });

  it("should block localhost and loopback", () => {
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.2")).toBe(true);
    expect(isPrivateUrl("http://127.1")).toBe(true);
    expect(isPrivateUrl("http://2130706433")).toBe(true);
    expect(isPrivateUrl("http://0x7f000001")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1.")).toBe(true);
  });

  it("should block private IP ranges", () => {
    // 10.0.0.0/8
    expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://10.255.255.255")).toBe(true);

    // 172.16.0.0/12
    expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.31.255.255")).toBe(true);

    // 192.168.0.0/16
    expect(isPrivateUrl("http://192.168.1.1")).toBe(true);
    expect(isPrivateUrl("http://192.168.255.255")).toBe(true);
  });

  it("should block other reserved ranges", () => {
    expect(isPrivateUrl("http://169.254.169.254")).toBe(true); // Link-local
    expect(isPrivateUrl("http://0.0.0.0")).toBe(true); // Unspecified
    expect(isPrivateUrl("http://100.64.0.1")).toBe(true); // Shared Address Space
    expect(isPrivateUrl("http://192.0.2.1")).toBe(true); // TEST-NET-1
    expect(isPrivateUrl("http://198.18.0.1")).toBe(true); // Benchmarking
  });

  it("should block internal hostnames", () => {
    expect(isPrivateUrl("http://server.local")).toBe(true);
    expect(isPrivateUrl("http://database.internal")).toBe(true);
    expect(isPrivateUrl("http://anything.localhost")).toBe(true);
  });

  it("should block IPv6 loopback and private ranges", () => {
    expect(isPrivateUrl("http://[::1]")).toBe(true);
    expect(isPrivateUrl("http://[::]")).toBe(true);
    expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
    expect(isPrivateUrl("http://[fc00::1]")).toBe(true);
    expect(isPrivateUrl("http://[fd00::1]")).toBe(true);
  });

  it("should block IPv4-mapped IPv6", () => {
    // These are often used to bypass filters
    expect(isPrivateUrl("http://[::ffff:127.0.0.1]")).toBe(true);
    expect(isPrivateUrl("http://[::ffff:10.0.0.1]")).toBe(true);

    // Test the hex-shortened version that some environments produce (::ffff:7f00:1)
    expect(isPrivateUrl("http://[::ffff:7f00:1]")).toBe(true);
    expect(isPrivateUrl("http://[::ffff:a00:1]")).toBe(true); // 10.0.0.1
    expect(isPrivateUrl("http://[::ffff:c0a8:101]")).toBe(true); // 192.168.1.1
  });

  it("should handle invalid URLs", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
    expect(isPrivateUrl("http://")).toBe(true);
    expect(isPrivateUrl("")).toBe(false); // as per updated implementation if null/empty
    expect(isPrivateUrl(null)).toBe(false);
    expect(isPrivateUrl(undefined)).toBe(false);
  });
});
