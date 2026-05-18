import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/webhook";

describe("isPrivateUrl security enhancements", () => {
  describe("Public URLs", () => {
    it("should allow public URLs", () => {
      expect(isPrivateUrl("https://google.com")).toBe(false);
      expect(isPrivateUrl("https://github.com/bl1nk-bot/agent-library")).toBe(false);
      expect(isPrivateUrl("https://8.8.8.8/")).toBe(false);
    });
  });

  describe("IPv4 Private Ranges", () => {
    it("should block loopback", () => {
      expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://127.1.2.3")).toBe(true);
    });

    it("should block private network ranges", () => {
      expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
      expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
      expect(isPrivateUrl("http://192.168.1.1")).toBe(true);
    });

    it("should block CGNAT range (100.64.0.0/10)", () => {
      expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
      expect(isPrivateUrl("http://100.127.255.255")).toBe(true);
      // Boundary checks
      expect(isPrivateUrl("http://100.63.255.255")).toBe(false);
      expect(isPrivateUrl("http://100.128.0.0")).toBe(false);
    });

    it("should block benchmarking range (198.18.0.0/15)", () => {
      expect(isPrivateUrl("http://198.18.0.1")).toBe(true);
      expect(isPrivateUrl("http://198.19.255.255")).toBe(true);
      // Boundary checks
      expect(isPrivateUrl("http://198.17.255.255")).toBe(false);
      expect(isPrivateUrl("http://198.20.0.0")).toBe(false);
    });

    it("should block link-local", () => {
      expect(isPrivateUrl("http://169.254.169.254")).toBe(true);
    });

    it("should block current network (0.0.0.0/8)", () => {
      expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
      expect(isPrivateUrl("http://0.255.255.255")).toBe(true);
    });
  });

  describe("IPv6 Private Ranges", () => {
    it("should block IPv6 loopback", () => {
      expect(isPrivateUrl("http://[::1]")).toBe(true);
      expect(isPrivateUrl("http://[0:0:0:0:0:0:0:1]")).toBe(true);
    });

    it("should block unspecified address", () => {
      expect(isPrivateUrl("http://[::]")).toBe(true);
    });

    it("should block link-local and unique local", () => {
      expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
      expect(isPrivateUrl("http://[fc00::1]")).toBe(true);
      expect(isPrivateUrl("http://[fd00::1]")).toBe(true);
    });
  });

  describe("Internal Hostnames", () => {
    it("should block localhost", () => {
      expect(isPrivateUrl("http://localhost")).toBe(true);
    });

    it("should block common internal TLDs", () => {
      expect(isPrivateUrl("http://server.local")).toBe(true);
      expect(isPrivateUrl("http://database.internal")).toBe(true);
      expect(isPrivateUrl("http://api.localhost")).toBe(true);
      expect(isPrivateUrl("http://myrouter.lan")).toBe(true);
    });
  });

  describe("Invalid URLs", () => {
    it("should block invalid URLs", () => {
      expect(isPrivateUrl("not-a-url")).toBe(true);
      expect(isPrivateUrl("http://")).toBe(true);
    });
  });
});
