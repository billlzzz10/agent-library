import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  describe("Public URLs", () => {
    it("should allow public domain URLs", () => {
      expect(isPrivateUrl("https://google.com")).toBe(false);
      expect(isPrivateUrl("https://github.com/prompts-chat")).toBe(false);
      expect(isPrivateUrl("http://example.com/image.jpg")).toBe(false);
    });

    it("should allow public IP addresses", () => {
      expect(isPrivateUrl("http://8.8.8.8")).toBe(false);
      expect(isPrivateUrl("http://1.1.1.1")).toBe(false);
    });
  });

  describe("Private/Internal URLs", () => {
    it("should block localhost and loopback", () => {
      expect(isPrivateUrl("http://localhost")).toBe(true);
      expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://127.0.0.1.")).toBe(true);
      expect(isPrivateUrl("http://[::1]")).toBe(true);
      expect(isPrivateUrl("http://[0:0:0:0:0:0:0:1]")).toBe(true);
    });

    it("should block RFC 1918 private IPv4 ranges", () => {
      expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://10.255.255.255")).toBe(true);
      expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
      expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
      expect(isPrivateUrl("http://192.168.0.1")).toBe(true);
      expect(isPrivateUrl("http://192.168.1.100")).toBe(true);
    });

    it("should block other reserved IPv4 ranges", () => {
      expect(isPrivateUrl("http://169.254.169.254")).toBe(true); // Link-local
      expect(isPrivateUrl("http://100.64.0.1")).toBe(true);      // CGNAT
      expect(isPrivateUrl("http://0.0.0.0")).toBe(true);        // Current network
      expect(isPrivateUrl("http://198.18.0.1")).toBe(true);     // Benchmarking
      expect(isPrivateUrl("http://224.0.0.1")).toBe(true);      // Multicast
      expect(isPrivateUrl("http://240.0.0.1")).toBe(true);      // Reserved
    });

    it("should block internal hostnames", () => {
      expect(isPrivateUrl("http://server.local")).toBe(true);
      expect(isPrivateUrl("http://database.internal")).toBe(true);
      expect(isPrivateUrl("http://api.localhost")).toBe(true);
      expect(isPrivateUrl("http://my-pc.lan")).toBe(true);
    });

    it("should block private/reserved IPv6 ranges", () => {
      expect(isPrivateUrl("http://[::]")).toBe(true);           // Unspecified
      expect(isPrivateUrl("http://[fc00::1]")).toBe(true);      // ULA
      expect(isPrivateUrl("http://[fd00::1]")).toBe(true);      // ULA
      expect(isPrivateUrl("http://[fe80::1]")).toBe(true);      // Link-local
      expect(isPrivateUrl("http://[ff02::1]")).toBe(true);      // Multicast
    });

    it("should block IPv4-mapped IPv6 for private ranges", () => {
      // Note: Node's URL parser might normalize these
      expect(isPrivateUrl("http://[::ffff:127.0.0.1]")).toBe(true);
      expect(isPrivateUrl("http://[::ffff:10.0.0.1]")).toBe(true);
    });
  });

  describe("Invalid and Dangerous Protocols", () => {
    it("should block non-http/https protocols", () => {
      expect(isPrivateUrl("file:///etc/passwd")).toBe(true);
      expect(isPrivateUrl("ftp://example.com")).toBe(true);
      expect(isPrivateUrl("gopher://example.com")).toBe(true);
      expect(isPrivateUrl("javascript:alert(1)")).toBe(true);
    });

    it("should block malformed URLs", () => {
      expect(isPrivateUrl("not-a-url")).toBe(true);
      expect(isPrivateUrl("http://")).toBe(true);
    });
  });
});
