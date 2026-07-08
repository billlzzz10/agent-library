import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  describe("Protocols", () => {
    it("should allow http and https", () => {
      expect(isPrivateUrl("http://example.com")).toBe(false);
      expect(isPrivateUrl("https://example.com")).toBe(false);
    });

    it("should block other protocols", () => {
      expect(isPrivateUrl("file:///etc/passwd")).toBe(true);
      expect(isPrivateUrl("gopher://example.com")).toBe(true);
      expect(isPrivateUrl("ftp://example.com")).toBe(true);
      expect(isPrivateUrl("javascript:alert(1)")).toBe(true);
      expect(isPrivateUrl("data:text/plain,hello")).toBe(true);
    });
  });

  describe("IPv4 Loopback and Private Ranges", () => {
    it("should block loopback addresses", () => {
      expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://127.0.0.2")).toBe(true);
      expect(isPrivateUrl("http://127.255.255.255")).toBe(true);
    });

    it("should block RFC 1918 private ranges", () => {
      expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://10.255.255.255")).toBe(true);
      expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
      expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
      expect(isPrivateUrl("http://192.168.0.1")).toBe(true);
      expect(isPrivateUrl("http://192.168.255.255")).toBe(true);
    });

    it("should block CGNAT range", () => {
      expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
      expect(isPrivateUrl("http://100.127.255.255")).toBe(true);
    });

    it("should block link-local", () => {
      expect(isPrivateUrl("http://169.254.0.1")).toBe(true);
    });

    it("should block benchmarking and test-net ranges", () => {
      expect(isPrivateUrl("http://198.18.0.1")).toBe(true);
      expect(isPrivateUrl("http://192.0.2.1")).toBe(true);
      expect(isPrivateUrl("http://198.51.100.1")).toBe(true);
      expect(isPrivateUrl("http://203.0.113.1")).toBe(true);
    });

    it("should block multicast and reserved ranges", () => {
      expect(isPrivateUrl("http://224.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://240.0.0.1")).toBe(true);
    });
  });

  describe("IPv6 Ranges", () => {
    it("should block IPv6 loopback", () => {
      expect(isPrivateUrl("http://[::1]")).toBe(true);
      expect(isPrivateUrl("http://[0:0:0:0:0:0:0:1]")).toBe(true);
    });

    it("should block IPv6 link-local and ULA", () => {
      expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
      expect(isPrivateUrl("http://[fc00::1]")).toBe(true);
      expect(isPrivateUrl("http://[fd00::1]")).toBe(true);
    });

    it("should block IPv4-mapped IPv6 loopback", () => {
      // Node.js URL parser normalizes [::ffff:127.0.0.1] to [::ffff:7f00:1]
      expect(isPrivateUrl("http://[::ffff:127.0.0.1]")).toBe(true);
      expect(isPrivateUrl("http://[::ffff:7f00:1]")).toBe(true);
    });

    it("should block IPv4-mapped IPv6 private ranges", () => {
      expect(isPrivateUrl("http://[::ffff:10.0.0.1]")).toBe(true);
      expect(isPrivateUrl("http://[::ffff:0a00:1]")).toBe(true);
    });
  });

  describe("Hostnames", () => {
    it("should block localhost and internal hostnames", () => {
      expect(isPrivateUrl("http://localhost")).toBe(true);
      expect(isPrivateUrl("http://server.local")).toBe(true);
      expect(isPrivateUrl("http://database.internal")).toBe(true);
      expect(isPrivateUrl("http://app.localhost")).toBe(true);
    });

    it("should handle trailing dots in hostnames", () => {
      expect(isPrivateUrl("http://127.0.0.1.")).toBe(true);
      expect(isPrivateUrl("http://example.com.")).toBe(false);
    });

    it("should allow public hostnames", () => {
      expect(isPrivateUrl("http://google.com")).toBe(false);
      expect(isPrivateUrl("https://github.com")).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should return false for empty input", () => {
      expect(isPrivateUrl("")).toBe(false);
      expect(isPrivateUrl(null)).toBe(false);
      expect(isPrivateUrl(undefined)).toBe(false);
    });

    it("should return true for malformed URLs", () => {
      expect(isPrivateUrl("not-a-url")).toBe(true);
      expect(isPrivateUrl("http://[invalid-ipv6]")).toBe(true);
    });
  });
});
