import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  describe("Public URLs", () => {
    it("should allow public domain names", () => {
      expect(isPrivateUrl("https://google.com")).toBe(false);
      expect(isPrivateUrl("https://github.com/test")).toBe(false);
      expect(isPrivateUrl("http://example.com:8080/path?q=1")).toBe(false);
    });

    it("should allow public IP addresses", () => {
      expect(isPrivateUrl("https://8.8.8.8")).toBe(false);
      expect(isPrivateUrl("http://1.1.1.1")).toBe(false);
    });
  });

  describe("Protocols", () => {
    it("should block non-http/https protocols", () => {
      expect(isPrivateUrl("file:///etc/passwd")).toBe(true);
      expect(isPrivateUrl("ftp://example.com")).toBe(true);
      expect(isPrivateUrl("gopher://example.com")).toBe(true);
      expect(isPrivateUrl("data:text/plain,test")).toBe(true);
      expect(isPrivateUrl("javascript:alert(1)")).toBe(true);
    });
  });

  describe("IPv4 Private and Reserved Ranges", () => {
    it("should block loopback (127.0.0.0/8)", () => {
      expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://127.0.0.2")).toBe(true);
      expect(isPrivateUrl("http://127.255.255.254")).toBe(true);
    });

    it("should block RFC 1918 private ranges", () => {
      // 10.0.0.0/8
      expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://10.255.255.255")).toBe(true);

      // 172.16.0.0/12
      expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
      expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
      expect(isPrivateUrl("http://172.15.255.255")).toBe(false); // Just outside
      expect(isPrivateUrl("http://172.32.0.0")).toBe(false); // Just outside

      // 192.168.0.0/16
      expect(isPrivateUrl("http://192.168.0.1")).toBe(true);
      expect(isPrivateUrl("http://192.168.255.255")).toBe(true);
    });

    it("should block link-local (169.254.0.0/16)", () => {
      expect(isPrivateUrl("http://169.254.169.254")).toBe(true);
      expect(isPrivateUrl("http://169.254.0.1")).toBe(true);
    });

    it("should block shared address space / CGNAT (100.64.0.0/10)", () => {
      expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
      expect(isPrivateUrl("http://100.127.255.255")).toBe(true);
      expect(isPrivateUrl("http://100.63.255.255")).toBe(false);
      expect(isPrivateUrl("http://100.128.0.0")).toBe(false);
    });

    it("should block benchmarking (198.18.0.0/15)", () => {
      expect(isPrivateUrl("http://198.18.0.1")).toBe(true);
      expect(isPrivateUrl("http://198.19.255.255")).toBe(true);
    });

    it("should block 0.0.0.0/8", () => {
      expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
      expect(isPrivateUrl("http://0.1.2.3")).toBe(true);
    });

    it("should block multicast and reserved", () => {
      expect(isPrivateUrl("http://224.0.0.1")).toBe(true); // Multicast
      expect(isPrivateUrl("http://240.0.0.1")).toBe(true); // Reserved
      expect(isPrivateUrl("http://255.255.255.255")).toBe(true); // Broadcast
    });
  });

  describe("IPv6 Private and Reserved Ranges", () => {
    it("should block IPv6 loopback", () => {
      expect(isPrivateUrl("http://[::1]")).toBe(true);
      expect(isPrivateUrl("http://[0:0:0:0:0:0:0:1]")).toBe(true);
    });

    it("should block IPv6 link-local and unique-local", () => {
      expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
      expect(isPrivateUrl("http://[fc00::1]")).toBe(true);
      expect(isPrivateUrl("http://[fd00::1]")).toBe(true);
    });

    it("should block unspecified address", () => {
      expect(isPrivateUrl("http://[::]")).toBe(true);
    });
  });

  describe("Hostname variations and bypasses", () => {
    it("should block localhost and internal hostnames", () => {
      expect(isPrivateUrl("http://localhost")).toBe(true);
      expect(isPrivateUrl("http://test.local")).toBe(true);
      expect(isPrivateUrl("http://service.internal")).toBe(true);
      expect(isPrivateUrl("http://app.localhost")).toBe(true);
    });

    it("should handle trailing dots in hostname", () => {
      expect(isPrivateUrl("http://127.0.0.1.")).toBe(true);
      expect(isPrivateUrl("http://localhost.")).toBe(true);
      expect(isPrivateUrl("https://google.com.")).toBe(false);
    });

    it("should handle case insensitivity", () => {
      expect(isPrivateUrl("HTTP://LOCALHOST")).toBe(true);
      expect(isPrivateUrl("https://GOOGLE.COM")).toBe(false);
    });

    it("should handle invalid URLs", () => {
      expect(isPrivateUrl("not-a-url")).toBe(true);
      expect(isPrivateUrl("http://")).toBe(true);
      expect(isPrivateUrl("")).toBe(false); // returns false for empty input as it's not "private"
    });
  });
});
