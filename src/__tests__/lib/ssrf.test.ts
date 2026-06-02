import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  describe("Localhost and loopback", () => {
    it("should block localhost", () => {
      expect(isPrivateUrl("http://localhost")).toBe(true);
      expect(isPrivateUrl("https://localhost:3000")).toBe(true);
    });

    it("should block 127.0.0.1", () => {
      expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://127.0.0.2")).toBe(true);
      expect(isPrivateUrl("http://127.255.255.255")).toBe(true);
    });

    it("should block 0.0.0.0", () => {
      expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
    });

    it("should block IPv6 loopback", () => {
      expect(isPrivateUrl("http://[::1]")).toBe(true);
      expect(isPrivateUrl("http://[::]")).toBe(true);
    });
  });

  describe("Private IP ranges (RFC 1918)", () => {
    it("should block 10.0.0.0/8", () => {
      expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://10.255.255.255")).toBe(true);
    });

    it("should block 172.16.0.0/12", () => {
      expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
      expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
      expect(isPrivateUrl("http://172.15.255.255")).toBe(false);
      expect(isPrivateUrl("http://172.32.0.1")).toBe(false);
    });

    it("should block 192.168.0.0/16", () => {
      expect(isPrivateUrl("http://192.168.0.1")).toBe(true);
      expect(isPrivateUrl("http://192.168.255.255")).toBe(true);
    });
  });

  describe("Special IP ranges", () => {
    it("should block Link-local (169.254.0.0/16)", () => {
      expect(isPrivateUrl("http://169.254.0.1")).toBe(true);
      expect(isPrivateUrl("http://169.254.169.254")).toBe(true);
    });

    it("should block CGNAT (100.64.0.0/10)", () => {
      expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
      expect(isPrivateUrl("http://100.127.255.254")).toBe(true);
      expect(isPrivateUrl("http://100.63.255.255")).toBe(false);
      expect(isPrivateUrl("http://100.128.0.1")).toBe(false);
    });

    it("should block Benchmarking (198.18.0.0/15)", () => {
      expect(isPrivateUrl("http://198.18.0.1")).toBe(true);
      expect(isPrivateUrl("http://198.19.255.254")).toBe(true);
      expect(isPrivateUrl("http://198.17.255.255")).toBe(false);
      expect(isPrivateUrl("http://198.20.0.1")).toBe(false);
    });

    it("should block Multicast and Reserved", () => {
      expect(isPrivateUrl("http://224.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://240.0.0.1")).toBe(true);
    });
  });

  describe("Internal hostnames", () => {
    it("should block .local, .internal, .localhost", () => {
      expect(isPrivateUrl("http://service.local")).toBe(true);
      expect(isPrivateUrl("http://database.internal")).toBe(true);
      expect(isPrivateUrl("http://my.localhost")).toBe(true);
    });
  });

  describe("Public URLs", () => {
    it("should allow public URLs", () => {
      expect(isPrivateUrl("https://google.com")).toBe(false);
      expect(isPrivateUrl("https://github.com/bl1nk-bot")).toBe(false);
      expect(isPrivateUrl("https://prompts.chat")).toBe(false);
      expect(isPrivateUrl("http://8.8.8.8")).toBe(false);
      expect(isPrivateUrl("http://1.1.1.1")).toBe(false);
    });
  });

  describe("Invalid inputs", () => {
    it("should return true for invalid URLs", () => {
      expect(isPrivateUrl("not-a-url")).toBe(true);
      expect(isPrivateUrl("http://")).toBe(true);
    });

    it("should return false for empty input", () => {
      expect(isPrivateUrl("")).toBe(false);
    });
  });
});
