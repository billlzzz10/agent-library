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
      expect(isPrivateUrl("ftp://example.com")).toBe(true);
      expect(isPrivateUrl("gopher://example.com")).toBe(true);
      expect(isPrivateUrl("javascript:alert(1)")).toBe(true);
      expect(isPrivateUrl("data:text/plain;base64,SGVsbG8=")).toBe(true);
    });
  });

  describe("IPv4 Private Ranges", () => {
    it("should block loopback", () => {
      expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://127.1.2.3")).toBe(true);
      expect(isPrivateUrl("http://localhost")).toBe(true);
    });

    it("should block RFC 1918 private ranges", () => {
      // 10.0.0.0/8
      expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://10.255.255.255")).toBe(true);

      // 172.16.0.0/12
      expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
      expect(isPrivateUrl("http://172.31.255.255")).toBe(true);

      // 192.168.0.0/16
      expect(isPrivateUrl("http://192.168.0.1")).toBe(true);
      expect(isPrivateUrl("http://192.168.255.255")).toBe(true);
    });

    it("should block CGNAT range (100.64.0.0/10)", () => {
      expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
      expect(isPrivateUrl("http://100.127.255.255")).toBe(true);
    });

    it("should block Link-local (169.254.0.0/16)", () => {
      expect(isPrivateUrl("http://169.254.0.1")).toBe(true);
    });

    it("should block other reserved ranges", () => {
      expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
      expect(isPrivateUrl("http://192.0.2.1")).toBe(true); // TEST-NET-1
      expect(isPrivateUrl("http://198.51.100.1")).toBe(true); // TEST-NET-2
      expect(isPrivateUrl("http://203.0.113.1")).toBe(true); // TEST-NET-3
      expect(isPrivateUrl("http://224.0.0.1")).toBe(true); // Multicast
      expect(isPrivateUrl("http://240.0.0.1")).toBe(true); // Reserved
    });

    it("should allow public IP addresses", () => {
      expect(isPrivateUrl("http://8.8.8.8")).toBe(false);
      expect(isPrivateUrl("http://1.1.1.1")).toBe(false);
      expect(isPrivateUrl("http://93.184.216.34")).toBe(false); // example.com
    });
  });

  describe("IPv6 Ranges", () => {
    it("should block loopback", () => {
      expect(isPrivateUrl("http://[::1]")).toBe(true);
      expect(isPrivateUrl("http://[0:0:0:0:0:0:0:1]")).toBe(true);
    });

    it("should block link-local", () => {
      expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
    });

    it("should block unique local", () => {
      expect(isPrivateUrl("http://[fc00::1]")).toBe(true);
      expect(isPrivateUrl("http://[fd00::1]")).toBe(true);
    });

    it("should block multicast", () => {
      expect(isPrivateUrl("http://[ff02::1]")).toBe(true);
    });

    it("should block unspecified address", () => {
      expect(isPrivateUrl("http://[::]")).toBe(true);
    });

    it("should allow public IPv6 addresses", () => {
      expect(isPrivateUrl("http://[2606:4700:4700::1111]")).toBe(false);
    });
  });

  describe("Hostnames", () => {
    it("should block internal-sounding hostnames", () => {
      expect(isPrivateUrl("http://server.local")).toBe(true);
      expect(isPrivateUrl("http://database.internal")).toBe(true);
      expect(isPrivateUrl("http://my.localhost")).toBe(true);
      expect(isPrivateUrl("http://router.lan")).toBe(true);
    });

    it("should handle trailing dots in hostnames", () => {
      // Browsers and many resolvers handle trailing dots as "absolute" hostnames.
      // We should normalize them.
      expect(isPrivateUrl("http://127.0.0.1.")).toBe(true);
      expect(isPrivateUrl("http://localhost.")).toBe(true);
      expect(isPrivateUrl("http://example.com.")).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should return true for invalid URLs", () => {
      expect(isPrivateUrl("not-a-url")).toBe(true);
      expect(isPrivateUrl("")).toBe(true);
    });
  });
});
