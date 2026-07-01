import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  describe("Protocols", () => {
    it("should allow http and https", () => {
      expect(isPrivateUrl("http://example.com")).toBe(false);
      expect(isPrivateUrl("https://example.com")).toBe(false);
    });

    it("should block non-http protocols", () => {
      expect(isPrivateUrl("file:///etc/passwd")).toBe(true);
      expect(isPrivateUrl("ftp://example.com")).toBe(true);
      expect(isPrivateUrl("gopher://example.com")).toBe(true);
      expect(isPrivateUrl("javascript:alert(1)")).toBe(true);
      expect(isPrivateUrl("data:text/plain,hello")).toBe(true);
    });
  });

  describe("IPv4 Loopback and Private Ranges", () => {
    it("should block loopback addresses", () => {
      expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://127.1.2.3")).toBe(true);
      expect(isPrivateUrl("http://localhost")).toBe(true);
    });

    it("should block RFC 1918 private ranges", () => {
      // 10.0.0.0/8
      expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://10.255.255.254")).toBe(true);

      // 172.16.0.0/12
      expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
      expect(isPrivateUrl("http://172.31.255.254")).toBe(true);
      expect(isPrivateUrl("http://172.15.255.255")).toBe(false);
      expect(isPrivateUrl("http://172.32.0.0")).toBe(false);

      // 192.168.0.0/16
      expect(isPrivateUrl("http://192.168.0.1")).toBe(true);
      expect(isPrivateUrl("http://192.168.255.254")).toBe(true);
    });

    it("should block other reserved IPv4 ranges", () => {
      // CGNAT 100.64.0.0/10
      expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
      expect(isPrivateUrl("http://100.127.255.254")).toBe(true);
      expect(isPrivateUrl("http://100.63.255.255")).toBe(false);
      expect(isPrivateUrl("http://100.128.0.0")).toBe(false);

      // Link-local 169.254.0.0/16
      expect(isPrivateUrl("http://169.254.0.1")).toBe(true);

      // Documentation and Benchmarking
      expect(isPrivateUrl("http://192.0.2.1")).toBe(true); // TEST-NET-1
      expect(isPrivateUrl("http://198.18.0.1")).toBe(true); // Benchmarking
      expect(isPrivateUrl("http://198.19.255.254")).toBe(true); // Benchmarking
      expect(isPrivateUrl("http://198.51.100.1")).toBe(true); // TEST-NET-2
      expect(isPrivateUrl("http://203.0.113.1")).toBe(true); // TEST-NET-3

      // Multicast and Reserved
      expect(isPrivateUrl("http://224.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://240.0.0.1")).toBe(true);
    });
  });

  describe("IPv6", () => {
    it("should block loopback", () => {
      expect(isPrivateUrl("http://[::1]")).toBe(true);
      expect(isPrivateUrl("http://[0:0:0:0:0:0:0:1]")).toBe(true);
    });

    it("should block private and link-local ranges", () => {
      expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
      expect(isPrivateUrl("http://[fc00::1]")).toBe(true);
      expect(isPrivateUrl("http://[fd00::1]")).toBe(true);
    });

    it("should block IPv4-mapped IPv6 if it points to private address", () => {
      expect(isPrivateUrl("http://[::ffff:127.0.0.1]")).toBe(true);
      expect(isPrivateUrl("http://[::ffff:192.168.0.1]")).toBe(true);
      expect(isPrivateUrl("http://[::ffff:8.8.8.8]")).toBe(false);
    });
  });

  describe("Hostnames", () => {
    it("should block internal suffixes", () => {
      expect(isPrivateUrl("http://myserver.local")).toBe(true);
      expect(isPrivateUrl("http://api.internal")).toBe(true);
      expect(isPrivateUrl("http://test.localhost")).toBe(true);
    });

    it("should handle trailing dots", () => {
      expect(isPrivateUrl("http://127.0.0.1.")).toBe(true);
      expect(isPrivateUrl("http://localhost.")).toBe(true);
      expect(isPrivateUrl("http://example.com.")).toBe(false);
    });
  });

  describe("Evasion and Edge Cases", () => {
    it("should block IP encoded in other formats (normalized by URL parser)", () => {
      // new URL() normalizes these
      expect(isPrivateUrl("http://2130706433")).toBe(true); // 127.0.0.1 decimal
      expect(isPrivateUrl("http://0x7f.0.0.1")).toBe(true); // 127.0.0.1 hex
      expect(isPrivateUrl("http://0177.0.0.1")).toBe(true); // 127.0.0.1 octal
    });

    it("should treat invalid URLs as private/dangerous", () => {
      expect(isPrivateUrl("not-a-url")).toBe(true);
      expect(isPrivateUrl("http://[invalid-ipv6]")).toBe(true);
    });
  });
});
