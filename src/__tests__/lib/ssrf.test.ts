import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  describe("Benign URLs", () => {
    it("should allow public URLs", () => {
      expect(isPrivateUrl("https://google.com")).toBe(false);
      expect(isPrivateUrl("https://github.com/features")).toBe(false);
      expect(isPrivateUrl("http://example.com:8080/path?query=1")).toBe(false);
    });

    it("should allow public IPv4 addresses", () => {
      expect(isPrivateUrl("http://8.8.8.8")).toBe(false);
      expect(isPrivateUrl("http://1.1.1.1")).toBe(false);
    });
  });

  describe("Loopback and Localhost", () => {
    it("should block localhost", () => {
      expect(isPrivateUrl("http://localhost")).toBe(true);
      expect(isPrivateUrl("https://localhost:3000")).toBe(true);
    });

    it("should block loopback IPv4", () => {
      expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://127.0.0.1.")).toBe(true);
      expect(isPrivateUrl("http://127.1")).toBe(true);
      expect(isPrivateUrl("http://2130706433")).toBe(true);
    });

    it("should block loopback IPv6", () => {
      expect(isPrivateUrl("http://[::1]")).toBe(true);
      expect(isPrivateUrl("http://[0:0:0:0:0:0:0:1]")).toBe(true);
    });
  });

  describe("Private IPv4 Ranges (RFC 1918)", () => {
    it("should block 10.0.0.0/8", () => {
      expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://10.255.255.255")).toBe(true);
    });

    it("should block 172.16.0.0/12", () => {
      expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
      expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
    });

    it("should block 192.168.0.0/16", () => {
      expect(isPrivateUrl("http://192.168.0.1")).toBe(true);
      expect(isPrivateUrl("http://192.168.1.100")).toBe(true);
    });
  });

  describe("Other Reserved IPv4 Ranges", () => {
    it("should block 0.0.0.0/8", () => {
      expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
      expect(isPrivateUrl("http://0.1.2.3")).toBe(true);
    });

    it("should block Link-local 169.254.0.0/16", () => {
      expect(isPrivateUrl("http://169.254.0.1")).toBe(true);
    });

    it("should block CGNAT 100.64.0.0/10", () => {
      expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
      expect(isPrivateUrl("http://100.127.255.255")).toBe(true);
    });

    it("should block Benchmarking 198.18.0.0/15", () => {
      expect(isPrivateUrl("http://198.18.0.1")).toBe(true);
      expect(isPrivateUrl("http://198.19.255.255")).toBe(true);
    });

    it("should block Multicast 224.0.0.0/4", () => {
      expect(isPrivateUrl("http://224.0.0.1")).toBe(true);
    });

    it("should block Reserved 240.0.0.0/4", () => {
      expect(isPrivateUrl("http://241.0.0.1")).toBe(true);
    });
  });

  describe("Internal Hostnames", () => {
    it("should block .local, .internal, .localhost, .lan", () => {
      expect(isPrivateUrl("http://myserver.local")).toBe(true);
      expect(isPrivateUrl("http://database.internal")).toBe(true);
      expect(isPrivateUrl("http://test.localhost")).toBe(true);
      expect(isPrivateUrl("http://router.lan")).toBe(true);
    });
  });

  describe("Private/Reserved IPv6 Ranges", () => {
    it("should block Link-local fe80::/10", () => {
      expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
    });

    it("should block Unique Local fc00::/7", () => {
      expect(isPrivateUrl("http://[fc00::1]")).toBe(true);
      expect(isPrivateUrl("http://[fd00::1]")).toBe(true);
    });

    it("should block Multicast ff00::/8", () => {
      expect(isPrivateUrl("http://[ff02::1]")).toBe(true);
    });

    it("should block Unspecified ::", () => {
      expect(isPrivateUrl("http://[::]")).toBe(true);
    });
  });

  describe("Protocol and Edge Cases", () => {
    it("should block non-http/https protocols", () => {
      expect(isPrivateUrl("file:///etc/passwd")).toBe(true);
      expect(isPrivateUrl("ftp://1.1.1.1")).toBe(true);
      expect(isPrivateUrl("gopher://localhost")).toBe(true);
    });

    it("should block invalid URLs", () => {
      expect(isPrivateUrl("not-a-url")).toBe(true);
      expect(isPrivateUrl("http://[invalid-ipv6]")).toBe(true);
    });
  });
});
