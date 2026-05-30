import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  describe("Public URLs", () => {
    it("should allow public domain names", () => {
      expect(isPrivateUrl("https://google.com")).toBe(false);
      expect(isPrivateUrl("https://github.com/test")).toBe(false);
      expect(isPrivateUrl("http://example.org:8080/path")).toBe(false);
    });

    it("should allow public IP addresses", () => {
      expect(isPrivateUrl("http://8.8.8.8")).toBe(false);
      expect(isPrivateUrl("http://1.1.1.1")).toBe(false);
      expect(isPrivateUrl("http://104.26.10.228")).toBe(false);
    });
  });

  describe("Private IPv4 addresses", () => {
    it("should block loopback addresses", () => {
      expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://127.0.0.2")).toBe(true);
      expect(isPrivateUrl("http://127.1.2.3")).toBe(true);
    });

    it("should block RFC1918 private ranges", () => {
      // 10.0.0.0/8
      expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://10.255.255.255")).toBe(true);

      // 172.16.0.0/12
      expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
      expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
      expect(isPrivateUrl("http://172.15.255.255")).toBe(false);
      expect(isPrivateUrl("http://172.32.0.0")).toBe(false);

      // 192.168.0.0/16
      expect(isPrivateUrl("http://192.168.0.1")).toBe(true);
      expect(isPrivateUrl("http://192.168.255.255")).toBe(true);
    });

    it("should block link-local addresses (169.254.0.0/16)", () => {
      expect(isPrivateUrl("http://169.254.0.1")).toBe(true);
      expect(isPrivateUrl("http://169.254.255.255")).toBe(true);
    });

    it("should block 0.0.0.0/8", () => {
      expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
      expect(isPrivateUrl("http://0.1.2.3")).toBe(true);
    });

    it("should block multicast and reserved ranges", () => {
      expect(isPrivateUrl("http://224.0.0.1")).toBe(true); // Multicast
      expect(isPrivateUrl("http://240.0.0.1")).toBe(true); // Reserved
    });
  });

  describe("Private Hostnames", () => {
    it("should block localhost", () => {
      expect(isPrivateUrl("http://localhost")).toBe(true);
      expect(isPrivateUrl("http://localhost:3000")).toBe(true);
    });

    it("should block internal TLDs", () => {
      expect(isPrivateUrl("http://service.local")).toBe(true);
      expect(isPrivateUrl("http://database.internal")).toBe(true);
      expect(isPrivateUrl("http://test.localhost")).toBe(true);
    });
  });

  describe("IPv6 addresses", () => {
    it("should block loopback", () => {
      expect(isPrivateUrl("http://[::1]")).toBe(true);
      expect(isPrivateUrl("http://[0:0:0:0:0:0:0:1]")).toBe(true);
    });

    it("should block link-local and unique local addresses", () => {
      expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
      expect(isPrivateUrl("http://[fc00::]")).toBe(true);
      expect(isPrivateUrl("http://[fd00::1]")).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("should block invalid URLs", () => {
      expect(isPrivateUrl("not-a-url")).toBe(true);
      expect(isPrivateUrl("http://")).toBe(true);
      expect(isPrivateUrl("")).toBe(true);
    });

    it("should handle mixed case hostnames", () => {
      expect(isPrivateUrl("http://LocalHost")).toBe(true);
      expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
      expect(isPrivateUrl("HTTPS://GOOGLE.COM")).toBe(false);
    });
  });
});
