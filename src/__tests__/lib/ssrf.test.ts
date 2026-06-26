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
      expect(isPrivateUrl("gopher://example.com")).toBe(true);
      expect(isPrivateUrl("ftp://example.com")).toBe(true);
      expect(isPrivateUrl("javascript:alert(1)")).toBe(true);
      expect(isPrivateUrl("data:text/plain,hello")).toBe(true);
    });
  });

  describe("IPv4 Private Ranges", () => {
    it("should block loopback", () => {
      expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://127.1.2.3")).toBe(true);
    });

    it("should block RFC1918 private ranges", () => {
      expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
      expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
      expect(isPrivateUrl("http://192.168.1.1")).toBe(true);
    });

    it("should block CGNAT range", () => {
      expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
      expect(isPrivateUrl("http://100.127.255.255")).toBe(true);
    });

    it("should block link-local", () => {
      expect(isPrivateUrl("http://169.254.0.1")).toBe(true);
    });

    it("should block benchmarking ranges", () => {
      expect(isPrivateUrl("http://198.18.0.1")).toBe(true);
      expect(isPrivateUrl("http://198.19.255.255")).toBe(true);
    });

    it("should block reserved/multicast", () => {
      expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
      expect(isPrivateUrl("http://224.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://240.0.0.1")).toBe(true);
    });
  });

  describe("Hostnames", () => {
    it("should block localhost", () => {
      expect(isPrivateUrl("http://localhost")).toBe(true);
    });

    it("should block internal TLDs", () => {
      expect(isPrivateUrl("http://service.local")).toBe(true);
      expect(isPrivateUrl("http://database.internal")).toBe(true);
      expect(isPrivateUrl("http://test.localhost")).toBe(true);
      expect(isPrivateUrl("http://home.lan")).toBe(true);
    });

    it("should handle trailing dots in hostnames", () => {
      // isPrivateUrl should strip trailing dots before check
      expect(isPrivateUrl("http://127.0.0.1.")).toBe(true);
      expect(isPrivateUrl("http://localhost.")).toBe(true);
      expect(isPrivateUrl("http://example.com.")).toBe(false);
    });
  });

  describe("IPv6", () => {
    it("should block loopback", () => {
      expect(isPrivateUrl("http://[::1]")).toBe(true);
    });

    it("should block unspecified address", () => {
      expect(isPrivateUrl("http://[::]")).toBe(true);
    });

    it("should block link-local", () => {
      expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
    });

    it("should block unique local addresses", () => {
      expect(isPrivateUrl("http://[fc00::1]")).toBe(true);
      expect(isPrivateUrl("http://[fd00::1]")).toBe(true);
    });

    it("should allow public IPv6", () => {
      expect(isPrivateUrl("http://[2001:db8::1]")).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should block invalid URLs", () => {
      expect(isPrivateUrl("not-a-url")).toBe(true);
    });

    it("should handle null/undefined", () => {
      expect(isPrivateUrl(null)).toBe(false);
      expect(isPrivateUrl(undefined)).toBe(false);
    });
  });
});
