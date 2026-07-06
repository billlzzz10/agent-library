import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  describe("Safe URLs", () => {
    it("should allow public domain names", () => {
      expect(isPrivateUrl("https://google.com")).toBe(false);
      expect(isPrivateUrl("https://github.com/prompts/chat")).toBe(false);
      expect(isPrivateUrl("https://api.wiro.ai/v1")).toBe(false);
    });

    it("should allow public IP addresses", () => {
      expect(isPrivateUrl("http://8.8.8.8")).toBe(false);
      expect(isPrivateUrl("http://1.1.1.1")).toBe(false);
    });

    it("should allow URLs with ports", () => {
      expect(isPrivateUrl("https://example.com:8080")).toBe(false);
    });
  });

  describe("Unsafe Protocols", () => {
    it("should block non-http/https protocols", () => {
      expect(isPrivateUrl("file:///etc/passwd")).toBe(true);
      expect(isPrivateUrl("gopher://localhost")).toBe(true);
      expect(isPrivateUrl("ftp://example.com")).toBe(true);
      expect(isPrivateUrl("javascript:alert(1)")).toBe(true);
    });
  });

  describe("Localhost variations", () => {
    it("should block localhost", () => {
      expect(isPrivateUrl("http://localhost")).toBe(true);
      expect(isPrivateUrl("http://localhost:3000")).toBe(true);
      expect(isPrivateUrl("https://localhost.com")).toBe(false); // Valid domain starting with localhost
    });

    it("should block 127.0.0.1", () => {
      expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://127.0.0.2")).toBe(true);
      expect(isPrivateUrl("http://127.255.255.255")).toBe(true);
    });

    it("should block IPv6 loopback", () => {
      expect(isPrivateUrl("http://[::1]")).toBe(true);
      expect(isPrivateUrl("http://[0:0:0:0:0:0:0:1]")).toBe(true);
    });
  });

  describe("Private IP ranges (RFC 1918)", () => {
    it("should block 10.0.0.0/8", () => {
      expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://10.255.255.254")).toBe(true);
    });

    it("should block 172.16.0.0/12", () => {
      expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
      expect(isPrivateUrl("http://172.31.255.254")).toBe(true);
      expect(isPrivateUrl("http://172.15.255.255")).toBe(false);
      expect(isPrivateUrl("http://172.32.0.0")).toBe(false);
    });

    it("should block 192.168.0.0/16", () => {
      expect(isPrivateUrl("http://192.168.0.1")).toBe(true);
      expect(isPrivateUrl("http://192.168.255.254")).toBe(true);
    });
  });

  describe("Other reserved ranges", () => {
    it("should block link-local (169.254.0.0/16)", () => {
      expect(isPrivateUrl("http://169.254.169.254")).toBe(true);
    });

    it("should block CGNAT (100.64.0.0/10)", () => {
      expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
      expect(isPrivateUrl("http://100.127.255.254")).toBe(true);
    });

    it("should block multicast and reserved", () => {
      expect(isPrivateUrl("http://224.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://240.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://255.255.255.255")).toBe(true);
    });

    it("should block benchmarking ranges (198.18.0.0/15)", () => {
        expect(isPrivateUrl("http://198.18.0.1")).toBe(true);
        expect(isPrivateUrl("http://198.19.255.254")).toBe(true);
    });

    it("should block documentation/test ranges", () => {
        expect(isPrivateUrl("http://192.0.2.1")).toBe(true);
        expect(isPrivateUrl("http://198.51.100.1")).toBe(true);
        expect(isPrivateUrl("http://203.0.113.1")).toBe(true);
    });
  });

  describe("Internal Hostnames", () => {
    it("should block .local, .internal, etc.", () => {
      expect(isPrivateUrl("http://database.local")).toBe(true);
      expect(isPrivateUrl("http://api.internal")).toBe(true);
      expect(isPrivateUrl("http://service.localhost")).toBe(true);
      expect(isPrivateUrl("http://test.example")).toBe(true);
    });

    it("should handle trailing dots", () => {
      expect(isPrivateUrl("http://127.0.0.1.")).toBe(true);
      expect(isPrivateUrl("http://localhost.")).toBe(true);
      expect(isPrivateUrl("https://google.com.")).toBe(false);
    });
  });

  describe("Edge cases and Malformed URLs", () => {
    it("should block malformed URLs", () => {
      expect(isPrivateUrl("not-a-url")).toBe(true);
      expect(isPrivateUrl("http://[invalid-ipv6]")).toBe(true);
    });

    it("should handle empty or null input", () => {
      expect(isPrivateUrl("")).toBe(false);
      // @ts-expect-error testing null
      expect(isPrivateUrl(null)).toBe(false);
    });
  });

  describe("IPv4-mapped IPv6", () => {
      it("should block IPv4-mapped loopback", () => {
          // Some environments might normalize this
          expect(isPrivateUrl("http://[::ffff:127.0.0.1]")).toBe(true);
      });
  });
});
