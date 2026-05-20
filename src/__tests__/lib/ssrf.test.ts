import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/webhook";

describe("isPrivateUrl", () => {
  it("should block localhost and loopback", () => {
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("https://localhost:3000")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.2")).toBe(true);
    expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
    expect(isPrivateUrl("http://[::1]")).toBe(true);
    expect(isPrivateUrl("http://[::]")).toBe(true);
    expect(isPrivateUrl("http://::")).toBe(true);
  });

  it("should block private IPv4 ranges", () => {
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

  it("should block special IPv4 ranges", () => {
    // 169.254.0.0/16 - Link-local
    expect(isPrivateUrl("http://169.254.0.1")).toBe(true);

    // 100.64.0.0/10 - CGNAT
    expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
    expect(isPrivateUrl("http://100.127.255.255")).toBe(true);

    // 198.18.0.0/15 - Benchmarking
    expect(isPrivateUrl("http://198.18.0.1")).toBe(true);
    expect(isPrivateUrl("http://198.19.255.255")).toBe(true);

    // 224.0.0.0/4 - Multicast
    expect(isPrivateUrl("http://224.0.0.1")).toBe(true);

    // 240.0.0.0/4 - Reserved
    expect(isPrivateUrl("http://240.0.0.1")).toBe(true);
  });

  it("should block private IPv6 ranges", () => {
    expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
    expect(isPrivateUrl("http://[fc00::1]")).toBe(true);
    expect(isPrivateUrl("http://[fd00::1]")).toBe(true);
  });

  it("should block internal hostnames", () => {
    expect(isPrivateUrl("http://server.local")).toBe(true);
    expect(isPrivateUrl("http://database.internal")).toBe(true);
    expect(isPrivateUrl("http://test.localhost")).toBe(true);
  });

  it("should allow public URLs", () => {
    expect(isPrivateUrl("https://google.com")).toBe(false);
    expect(isPrivateUrl("https://github.com/bl1nk-bot/agent-library")).toBe(false);
    expect(isPrivateUrl("https://1.1.1.1")).toBe(false);
    expect(isPrivateUrl("https://8.8.8.8")).toBe(false);
  });

  it("should block invalid URLs", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
    expect(isPrivateUrl("http://")).toBe(true);
  });
});
