import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/webhook";

describe("isPrivateUrl", () => {
  describe("Private/Internal IPv4 addresses", () => {
    const privateIps = [
      "http://127.0.0.1",
      "https://127.0.1.1",
      "http://10.0.0.1",
      "https://10.255.255.255",
      "http://172.16.0.1",
      "https://172.31.255.255",
      "http://192.168.0.1",
      "https://192.168.255.255",
      "http://169.254.169.254", // Metadata service
      "http://0.0.0.0",
      "http://224.0.0.1", // Multicast
      "http://240.0.0.1", // Reserved
      "http://100.64.0.1", // CGNAT
      "http://100.127.255.255", // CGNAT
      "http://198.18.0.1", // Benchmarking
      "http://198.19.255.255", // Benchmarking
    ];

    it.each(privateIps)("should block %s", (url) => {
      expect(isPrivateUrl(url)).toBe(true);
    });
  });

  describe("Private/Internal IPv6 addresses", () => {
    const privateIps = [
      "http://[::1]",
      "http://[::]",
      "http://[fe80::1]",
      "http://[fc00::1]",
      "http://[fd00::1]",
    ];

    it.each(privateIps)("should block %s", (url) => {
      expect(isPrivateUrl(url)).toBe(true);
    });
  });

  describe("Internal hostnames", () => {
    const internalHostnames = [
      "http://localhost",
      "https://localhost:3000",
      "http://api.internal",
      "http://database.local",
      "http://myservice.localhost",
    ];

    it.each(internalHostnames)("should block %s", (url) => {
      expect(isPrivateUrl(url)).toBe(true);
    });
  });

  describe("Public/Safe URLs", () => {
    const publicUrls = [
      "https://google.com",
      "https://github.com",
      "https://prompts.chat",
      "https://api.openai.com/v1/models",
      "https://picsum.photos/200",
      "https://1.1.1.1",
      "https://8.8.8.8",
    ];

    it.each(publicUrls)("should allow %s", (url) => {
      expect(isPrivateUrl(url)).toBe(false);
    });
  });

  describe("Edge cases and invalid URLs", () => {
    it("should block invalid URLs", () => {
      expect(isPrivateUrl("not-a-url")).toBe(true);
      expect(isPrivateUrl("http://")).toBe(true);
    });

    it("should be case-insensitive for hostnames", () => {
      expect(isPrivateUrl("http://LOCALHOST")).toBe(true);
      expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    });
  });
});
