import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  describe("Protocols", () => {
    it("should allow http and https", () => {
      expect(isPrivateUrl("http://example.com")).toBe(false);
      expect(isPrivateUrl("https://example.com")).toBe(false);
    });

    it("should block other protocols", () => {
      expect(isPrivateUrl("ftp://example.com")).toBe(true);
      expect(isPrivateUrl("file:///etc/passwd")).toBe(true);
      expect(isPrivateUrl("gopher://example.com")).toBe(true);
      expect(isPrivateUrl("javascript:alert(1)")).toBe(true);
    });
  });

  describe("IPv4 Loopback and Private Ranges", () => {
    it("should block loopback addresses", () => {
      expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://127.0.0.2")).toBe(true);
      expect(isPrivateUrl("http://127.255.255.255")).toBe(true);
    });

    it("should block RFC 1918 private ranges", () => {
      // 10.0.0.0/8
      expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://10.255.255.255")).toBe(true);

      // 172.16.0.0/12
      expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
      expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
      expect(isPrivateUrl("http://172.15.255.255")).toBe(false);
      expect(isPrivateUrl("http://172.32.0.1")).toBe(false);

      // 192.168.0.0/16
      expect(isPrivateUrl("http://192.168.0.1")).toBe(true);
      expect(isPrivateUrl("http://192.168.255.255")).toBe(true);
    });

    it("should block link-local addresses", () => {
      expect(isPrivateUrl("http://169.254.0.1")).toBe(true);
      expect(isPrivateUrl("http://169.254.255.255")).toBe(true);
    });

    it("should block other reserved IPv4 ranges", () => {
      expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
      expect(isPrivateUrl("http://100.64.0.1")).toBe(true); // CGNAT
      expect(isPrivateUrl("http://198.18.0.1")).toBe(true); // Benchmarking
      expect(isPrivateUrl("http://224.0.0.1")).toBe(true); // Multicast
      expect(isPrivateUrl("http://240.0.0.1")).toBe(true); // Reserved
    });
  });

  describe("IPv6 Addresses", () => {
    it("should block loopback and unspecified addresses", () => {
      expect(isPrivateUrl("http://[::1]")).toBe(true);
      expect(isPrivateUrl("http://[::]")).toBe(true);
      expect(isPrivateUrl("http://[0:0:0:0:0:0:0:1]")).toBe(true);
    });

    it("should block link-local and unique local addresses", () => {
      expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
      expect(isPrivateUrl("http://[fc00::1]")).toBe(true);
      expect(isPrivateUrl("http://[fd00::1]")).toBe(true);
    });

    it("should block multicast addresses", () => {
      expect(isPrivateUrl("http://[ff02::1]")).toBe(true);
    });
  });

  describe("Hostnames", () => {
    it("should block internal hostnames", () => {
      expect(isPrivateUrl("http://localhost")).toBe(true);
      expect(isPrivateUrl("http://service.local")).toBe(true);
      expect(isPrivateUrl("http://database.internal")).toBe(true);
      expect(isPrivateUrl("http://test.localhost")).toBe(true);
    });

    it("should handle trailing dots in hostnames", () => {
      expect(isPrivateUrl("http://127.0.0.1.")).toBe(true);
      expect(isPrivateUrl("http://localhost.")).toBe(true);
      expect(isPrivateUrl("http://example.com.")).toBe(false);
    });
  });

  describe("Invalid URLs", () => {
    it("should return true for invalid URLs", () => {
      expect(isPrivateUrl("not-a-url")).toBe(true);
      expect(isPrivateUrl("http://[invalid-ipv6]")).toBe(true);
    });
  });
});
