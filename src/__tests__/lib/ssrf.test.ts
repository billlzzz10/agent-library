import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  describe("Public URLs", () => {
    it("should allow public domain names", () => {
      expect(isPrivateUrl("https://google.com")).toBe(false);
      expect(isPrivateUrl("https://prompts.chat")).toBe(false);
      expect(isPrivateUrl("https://github.com/settings/profile")).toBe(false);
    });

    it("should allow public IP addresses", () => {
      expect(isPrivateUrl("http://8.8.8.8")).toBe(false);
      expect(isPrivateUrl("http://1.1.1.1")).toBe(false);
    });
  });

  describe("Private/Internal URLs", () => {
    it("should block localhost and loopback", () => {
      expect(isPrivateUrl("http://localhost")).toBe(true);
      expect(isPrivateUrl("http://localhost:3000")).toBe(true);
      expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://127.0.0.2")).toBe(true);
      expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
    });

    it("should block private IPv4 ranges (RFC 1918)", () => {
      // 10.0.0.0/8
      expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://10.255.255.255")).toBe(true);

      // 172.16.0.0/12
      expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
      expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
      expect(isPrivateUrl("http://172.32.0.1")).toBe(false); // Just outside range

      // 192.168.0.0/16
      expect(isPrivateUrl("http://192.168.1.1")).toBe(true);
      expect(isPrivateUrl("http://192.168.255.255")).toBe(true);
    });

    it("should block other special IPv4 ranges", () => {
      // Link-local (169.254.0.0/16)
      expect(isPrivateUrl("http://169.254.169.254")).toBe(true);

      // Carrier-grade NAT (100.64.0.0/10)
      expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
      expect(isPrivateUrl("http://100.127.255.255")).toBe(true);

      // Benchmarking (198.18.0.0/15)
      expect(isPrivateUrl("http://198.18.0.1")).toBe(true);
      expect(isPrivateUrl("http://198.19.255.255")).toBe(true);
    });

    it("should block internal hostnames", () => {
      expect(isPrivateUrl("http://app.local")).toBe(true);
      expect(isPrivateUrl("http://database.internal")).toBe(true);
      expect(isPrivateUrl("http://service.localhost")).toBe(true);
    });

    it("should block IPv6 loopback and internal ranges", () => {
      expect(isPrivateUrl("http://[::1]")).toBe(true);
      expect(isPrivateUrl("http://[::]")).toBe(true);
      expect(isPrivateUrl("http://[fe80::1]")).toBe(true); // Link-local
      expect(isPrivateUrl("http://[fc00::]")).toBe(true); // Unique local
      expect(isPrivateUrl("http://[fd00::]")).toBe(true); // Unique local
    });
  });

  describe("Edge Cases", () => {
    it("should treat invalid URLs as potentially dangerous", () => {
      expect(isPrivateUrl("not-a-url")).toBe(true);
      expect(isPrivateUrl("http://")).toBe(true);
    });

    it("should handle mixed case hostnames", () => {
      expect(isPrivateUrl("http://LOCALHOST")).toBe(true);
      expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    });
  });
});
