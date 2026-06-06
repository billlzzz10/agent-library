import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  describe("Public URLs", () => {
    it("should allow public domain names", () => {
      expect(isPrivateUrl("https://google.com")).toBe(false);
      expect(isPrivateUrl("https://github.com/bl1nk-bot")).toBe(false);
      expect(isPrivateUrl("https://prompts.chat")).toBe(false);
    });

    it("should allow public IP addresses", () => {
      expect(isPrivateUrl("http://8.8.8.8")).toBe(false);
      expect(isPrivateUrl("http://1.1.1.1")).toBe(false);
      expect(isPrivateUrl("http://93.184.216.34")).toBe(false); // example.com
    });
  });

  describe("Localhost and Private Hostnames", () => {
    it("should block localhost variations", () => {
      expect(isPrivateUrl("http://localhost")).toBe(true);
      expect(isPrivateUrl("http://localhost:3000")).toBe(true);
      expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
      expect(isPrivateUrl("http://[::1]")).toBe(true);
      expect(isPrivateUrl("http://[::]")).toBe(true);
    });

    it("should block internal domain suffixes", () => {
      expect(isPrivateUrl("http://my-service.local")).toBe(true);
      expect(isPrivateUrl("http://database.internal")).toBe(true);
      expect(isPrivateUrl("http://api.localhost")).toBe(true);
    });
  });

  describe("Private IPv4 Ranges", () => {
    it("should block 10.0.0.0/8 (Private-Use)", () => {
      expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
      expect(isPrivateUrl("http://10.255.255.255")).toBe(true);
    });

    it("should block 172.16.0.0/12 (Private-Use)", () => {
      expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
      expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
    });

    it("should block 192.168.0.0/16 (Private-Use)", () => {
      expect(isPrivateUrl("http://192.168.0.1")).toBe(true);
      expect(isPrivateUrl("http://192.168.1.100")).toBe(true);
    });

    it("should block 169.254.0.0/16 (Link-Local)", () => {
      expect(isPrivateUrl("http://169.254.169.254")).toBe(true);
    });

    it("should block 100.64.0.0/10 (Carrier-Grade NAT)", () => {
      expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
      expect(isPrivateUrl("http://100.127.255.255")).toBe(true);
    });

    it("should block other reserved ranges", () => {
      expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
      expect(isPrivateUrl("http://198.18.0.1")).toBe(true); // Benchmarking
      expect(isPrivateUrl("http://224.0.0.1")).toBe(true); // Multicast
      expect(isPrivateUrl("http://240.0.0.1")).toBe(true); // Reserved
    });
  });

  describe("IPv6 Ranges", () => {
    it("should block loopback and site-local", () => {
      expect(isPrivateUrl("http://[::1]")).toBe(true);
      expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
      expect(isPrivateUrl("http://[fc00::]")).toBe(true);
      expect(isPrivateUrl("http://[fd00::]")).toBe(true);
    });
  });

  describe("Bypass Attempts (Normalized by Node URL)", () => {
    it("should block shortened IP addresses", () => {
      // Node's URL constructor normalizes these to 127.0.0.1
      expect(isPrivateUrl("http://127.1")).toBe(true);
      expect(isPrivateUrl("http://127.0.1")).toBe(true);
    });

    it("should block hex-encoded IP addresses", () => {
      // Normalized to 127.0.0.1
      expect(isPrivateUrl("http://0x7f.0x0.0x0.0x1")).toBe(true);
    });

    it("should block decimal IP addresses", () => {
      // 2130706433 is 127.0.0.1 in decimal
      expect(isPrivateUrl("http://2130706433")).toBe(true);
    });

    it("should block octal IP addresses", () => {
      expect(isPrivateUrl("http://0177.0.0.1")).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should block invalid URLs", () => {
      expect(isPrivateUrl("not-a-url")).toBe(true);
      expect(isPrivateUrl("")).toBe(true);
    });
  });
});
