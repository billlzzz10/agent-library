import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/webhook";

describe("isPrivateUrl", () => {
  it("should identify public URLs as safe", () => {
    expect(isPrivateUrl("https://google.com")).toBe(false);
    expect(isPrivateUrl("https://github.com/bl1nk-bot")).toBe(false);
    expect(isPrivateUrl("https://8.8.8.8")).toBe(false);
    expect(isPrivateUrl("http://example.com:8080/path")).toBe(false);
  });

  it("should identify localhost and loopback as private", () => {
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("http://localhost:3000")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1:5432")).toBe(true);
    expect(isPrivateUrl("http://127.1.2.3")).toBe(true);
    expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
  });

  it("should identify private IPv4 ranges as private", () => {
    // 10.0.0.0/8
    expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://10.255.255.255")).toBe(true);

    // 172.16.0.0/12
    expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
    expect(isPrivateUrl("http://172.15.255.255")).toBe(false); // Just outside
    expect(isPrivateUrl("http://172.32.0.0")).toBe(false); // Just outside

    // 192.168.0.0/16
    expect(isPrivateUrl("http://192.168.0.1")).toBe(true);
    expect(isPrivateUrl("http://192.168.255.255")).toBe(true);
  });

  it("should identify CGNAT and benchmarking ranges as private", () => {
    // 100.64.0.0/10
    expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
    expect(isPrivateUrl("http://100.127.255.255")).toBe(true);
    expect(isPrivateUrl("http://100.63.255.255")).toBe(false);
    expect(isPrivateUrl("http://100.128.0.0")).toBe(false);

    // 198.18.0.0/15
    expect(isPrivateUrl("http://198.18.0.1")).toBe(true);
    expect(isPrivateUrl("http://198.19.255.255")).toBe(true);
    expect(isPrivateUrl("http://198.17.255.255")).toBe(false);
    expect(isPrivateUrl("http://198.20.0.0")).toBe(false);
  });

  it("should identify reserved/special IPv4 ranges as private", () => {
    // 169.254.0.0/16 (Link-local)
    expect(isPrivateUrl("http://169.254.0.1")).toBe(true);

    // 224.0.0.0/4 (Multicast)
    expect(isPrivateUrl("http://224.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://239.255.255.255")).toBe(true);

    // 240.0.0.0/4 (Reserved)
    expect(isPrivateUrl("http://240.0.0.1")).toBe(true);
  });

  it("should identify internal hostnames as private", () => {
    expect(isPrivateUrl("http://test.local")).toBe(true);
    expect(isPrivateUrl("http://api.internal")).toBe(true);
    expect(isPrivateUrl("http://database.lan")).toBe(true);
    expect(isPrivateUrl("http://my.localhost")).toBe(true);
  });

  it("should identify private IPv6 ranges as private", () => {
    expect(isPrivateUrl("http://[::1]")).toBe(true);
    expect(isPrivateUrl("http://[::]")).toBe(true);
    expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
    expect(isPrivateUrl("http://[fc00::1]")).toBe(true);
    expect(isPrivateUrl("http://[fd00::1]")).toBe(true);
    expect(isPrivateUrl("http://[ff00::1]")).toBe(true);

    // Public IPv6
    expect(isPrivateUrl("http://[2001:4860:4860::8888]")).toBe(false);
  });

  it("should treat invalid URLs as potentially dangerous (private)", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
    expect(isPrivateUrl("http://")).toBe(true);
  });
});
