import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  it("should allow public URLs", () => {
    expect(isPrivateUrl("https://google.com")).toBe(false);
    expect(isPrivateUrl("https://github.com/bl1nk-bot/agent-library")).toBe(false);
    expect(isPrivateUrl("http://example.com/path?query=1")).toBe(false);
    expect(isPrivateUrl("https://8.8.8.8")).toBe(false);
  });

  it("should block non-http/https protocols", () => {
    expect(isPrivateUrl("file:///etc/passwd")).toBe(true);
    expect(isPrivateUrl("ftp://example.com")).toBe(true);
    expect(isPrivateUrl("gopher://example.com")).toBe(true);
    expect(isPrivateUrl("data:text/plain,hello")).toBe(true);
  });

  it("should block localhost and variations", () => {
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("http://localhost:3000")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1:5432")).toBe(true);
    expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
    expect(isPrivateUrl("http://[::1]")).toBe(true);
  });

  it("should block internal hostnames", () => {
    expect(isPrivateUrl("http://my-service.local")).toBe(true);
    expect(isPrivateUrl("http://database.internal")).toBe(true);
    expect(isPrivateUrl("http://test.localhost")).toBe(true);
  });

  it("should block private IPv4 ranges (RFC 1918)", () => {
    expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://10.255.255.255")).toBe(true);
    expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
    expect(isPrivateUrl("http://192.168.1.1")).toBe(true);
    expect(isPrivateUrl("http://192.168.255.255")).toBe(true);
  });

  it("should block CGNAT range", () => {
    expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
    expect(isPrivateUrl("http://100.127.255.255")).toBe(true);
  });

  it("should block link-local addresses", () => {
    expect(isPrivateUrl("http://169.254.0.1")).toBe(true);
    expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
  });

  it("should block benchmarking ranges", () => {
    expect(isPrivateUrl("http://198.18.0.1")).toBe(true);
    expect(isPrivateUrl("http://198.19.255.255")).toBe(true);
  });

  it("should block multicast and reserved ranges", () => {
    expect(isPrivateUrl("http://224.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://240.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://[ff02::1]")).toBe(true);
  });

  it("should block IPv6 unique local addresses", () => {
    expect(isPrivateUrl("http://[fc00::1]")).toBe(true);
    expect(isPrivateUrl("http://[fd00::1]")).toBe(true);
  });

  it("should handle hostname normalization", () => {
    expect(isPrivateUrl("http://127.0.0.1.")).toBe(true);
    expect(isPrivateUrl("http://LOCALHOST")).toBe(true);
  });

  it("should handle invalid URLs", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
    expect(isPrivateUrl("http://")).toBe(true);
  });
});
