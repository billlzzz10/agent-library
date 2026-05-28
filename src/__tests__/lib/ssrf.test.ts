import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/ssrf";

describe("isPrivateUrl", () => {
  describe("Public URLs", () => {
    it("should allow public domains", () => {
      expect(isPrivateUrl("https://google.com")).toBe(false);
      expect(isPrivateUrl("https://github.com/test")).toBe(false);
      expect(isPrivateUrl("http://example.com:8080/path?q=1")).toBe(false);
    });

    it("should allow public IPv4 addresses", () => {
      expect(isPrivateUrl("http://8.8.8.8")).toBe(false);
      expect(isPrivateUrl("http://1.1.1.1")).toBe(false);
      expect(isPrivateUrl("http://93.184.216.34")).toBe(false);
    });
  });

  describe("Private/Internal URLs", () => {
    it("should block localhost variations", () => {
      expect(isPrivateUrl("http://localhost")).toBe(true);
      expect(isPrivateUrl("http://localhost:3000")).toBe(true);
      expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://127.0.0.1:8080")).toBe(true);
      expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
      expect(isPrivateUrl("http://[::1]")).toBe(true);
      expect(isPrivateUrl("http://[::]")).toBe(true);
    });

    it("should block RFC1918 private IPv4 ranges", () => {
      // 10.0.0.0/8
      expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://10.255.255.255")).toBe(true);

      // 172.16.0.0/12
      expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
      expect(isPrivateUrl("http://172.31.255.255")).toBe(true);

      // 192.168.0.0/16
      expect(isPrivateUrl("http://192.168.1.1")).toBe(true);
      expect(isPrivateUrl("http://192.168.255.255")).toBe(true);
    });

    it("should block other reserved IPv4 ranges", () => {
      // 169.254.0.0/16 - Link-local
      expect(isPrivateUrl("http://169.254.169.254")).toBe(true);

      // 127.0.0.0/8 - Loopback
      expect(isPrivateUrl("http://127.1.2.3")).toBe(true);

      // 100.64.0.0/10 - CGNAT
      expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
      expect(isPrivateUrl("http://100.127.255.255")).toBe(true);

      // 198.18.0.0/15 - Benchmarking
      expect(isPrivateUrl("http://198.18.0.1")).toBe(true);
      expect(isPrivateUrl("http://198.19.255.255")).toBe(true);
    });

    it("should block internal hostnames", () => {
      expect(isPrivateUrl("http://test.local")).toBe(true);
      expect(isPrivateUrl("http://service.internal")).toBe(true);
      expect(isPrivateUrl("http://database.localhost")).toBe(true);
    });

    it("should block private IPv6 ranges", () => {
      expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
      expect(isPrivateUrl("http://[fc00::]")).toBe(true);
      expect(isPrivateUrl("http://[fd00::]")).toBe(true);
    });
  });

  describe("Normalized IP formats", () => {
    it("should block decimal IP representation of localhost", () => {
      // http://2130706433 is http://127.0.0.1
      expect(isPrivateUrl("http://2130706433")).toBe(true);
    });

    it("should block hex IP representation of localhost", () => {
      // http://0x7f000001 is http://127.0.0.1
      expect(isPrivateUrl("http://0x7f000001")).toBe(true);
    });

    it("should block octal IP representation of localhost", () => {
      // http://0177.0.0.1 is http://127.0.0.1
      expect(isPrivateUrl("http://0177.0.0.1")).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("should block invalid URLs", () => {
      expect(isPrivateUrl("not-a-url")).toBe(true);
      expect(isPrivateUrl("http://")).toBe(true);
    });
  });
});
