import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/ssrf";

describe("isPrivateUrl", () => {
  describe("Public URLs", () => {
    it("should allow standard public URLs", () => {
      expect(isPrivateUrl("https://google.com")).toBe(false);
      expect(isPrivateUrl("https://github.com/abc")).toBe(false);
      expect(isPrivateUrl("http://example.org:8080/path?q=1")).toBe(false);
    });

    it("should allow public IPv4 addresses", () => {
      expect(isPrivateUrl("http://8.8.8.8")).toBe(false);
      expect(isPrivateUrl("http://1.1.1.1")).toBe(false);
      expect(isPrivateUrl("http://93.184.216.34")).toBe(false);
    });

    it("should allow public IPv6 addresses", () => {
      expect(isPrivateUrl("http://[2001:4860:4860::8888]")).toBe(false);
    });
  });

  describe("Private IPv4 Ranges", () => {
    it("should block loopback (127.0.0.0/8)", () => {
      expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://127.0.0.2")).toBe(true);
      expect(isPrivateUrl("http://127.255.255.255")).toBe(true);
    });

    it("should block private range 10.0.0.0/8", () => {
      expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://10.255.255.255")).toBe(true);
    });

    it("should block private range 172.16.0.0/12", () => {
      expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
      expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
      // Boundary check
      expect(isPrivateUrl("http://172.15.255.255")).toBe(false);
      expect(isPrivateUrl("http://172.32.0.0")).toBe(false);
    });

    it("should block private range 192.168.0.0/16", () => {
      expect(isPrivateUrl("http://192.168.0.1")).toBe(true);
      expect(isPrivateUrl("http://192.168.255.255")).toBe(true);
    });

    it("should block link-local 169.254.0.0/16", () => {
      expect(isPrivateUrl("http://169.254.0.1")).toBe(true);
      expect(isPrivateUrl("http://169.254.255.255")).toBe(true);
    });

    it("should block CGNAT 100.64.0.0/10", () => {
      expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
      expect(isPrivateUrl("http://100.127.255.255")).toBe(true);
      // Boundary check
      expect(isPrivateUrl("http://100.63.255.255")).toBe(false);
      expect(isPrivateUrl("http://100.128.0.0")).toBe(false);
    });

    it("should block Benchmarking 198.18.0.0/15", () => {
      expect(isPrivateUrl("http://198.18.0.1")).toBe(true);
      expect(isPrivateUrl("http://198.19.255.255")).toBe(true);
      // Boundary check
      expect(isPrivateUrl("http://198.17.255.255")).toBe(false);
      expect(isPrivateUrl("http://198.20.0.0")).toBe(false);
    });

    it("should block other reserved IPv4 ranges", () => {
      expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
      expect(isPrivateUrl("http://224.0.0.1")).toBe(true); // Multicast
      expect(isPrivateUrl("http://240.0.0.1")).toBe(true); // Reserved
    });
  });

  describe("Private IPv6 Ranges", () => {
    it("should block loopback and unspecified", () => {
      expect(isPrivateUrl("http://[::1]")).toBe(true);
      expect(isPrivateUrl("http://[::]")).toBe(true);
      expect(isPrivateUrl("http://[0:0:0:0:0:0:0:0]")).toBe(true);
      expect(isPrivateUrl("http://[0:0:0:0:0:0:0:1]")).toBe(true);
    });

    it("should block link-local (fe80::/10)", () => {
      expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
    });

    it("should block unique local (fc00::/7)", () => {
      expect(isPrivateUrl("http://[fc00::1]")).toBe(true);
      expect(isPrivateUrl("http://[fd00::1]")).toBe(true);
    });
  });

  describe("Internal Hostnames", () => {
    it("should block localhost and variations", () => {
      expect(isPrivateUrl("http://localhost")).toBe(true);
      expect(isPrivateUrl("http://LOCALHOST")).toBe(true);
    });

    it("should block common internal TLDs", () => {
      expect(isPrivateUrl("http://myserver.local")).toBe(true);
      expect(isPrivateUrl("http://internal.service.internal")).toBe(true);
      expect(isPrivateUrl("http://test.localhost")).toBe(true);
    });
  });

  describe("Obfuscated IP Formats", () => {
    // Node.js URL normalizes these automatically
    it("should block decimal IPs", () => {
      expect(isPrivateUrl("http://2130706433")).toBe(true); // 127.0.0.1
    });

    it("should block hex IPs", () => {
      expect(isPrivateUrl("http://0x7f000001")).toBe(true); // 127.0.0.1
    });

    it("should block octal IPs", () => {
      expect(isPrivateUrl("http://0177.0.0.01")).toBe(true); // 127.0.0.1
    });
  });

  describe("Edge Cases", () => {
    it("should treat invalid URLs as private/dangerous", () => {
      expect(isPrivateUrl("not-a-url")).toBe(true);
      expect(isPrivateUrl("http://")).toBe(true);
    });
  });
});
