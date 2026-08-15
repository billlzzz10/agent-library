import { describe, it, expect, vi } from "vitest";
import { validateUrl } from "@/lib/security";

vi.mock("dns/promises", () => {
  const lookupFn = vi.fn(async (hostname: string) => {
    if (hostname === "public.example.com") {
      return { address: "93.184.216.34" };
    }
    if (hostname === "internal.example.com") {
      return { address: "10.0.0.5" };
    }
    if (hostname === "loopback.example.com") {
      return { address: "127.0.0.1" };
    }
    if (hostname === "unresolvable.example.invalid") {
      throw new Error("getaddrinfo ENOTFOUND unresolvable.example.invalid");
    }
    return { address: "93.184.216.34" };
  });

  return {
    lookup: lookupFn,
    default: {
      lookup: lookupFn,
    },
  };
});

describe("validateUrl", () => {
  it("allows valid public URLs", async () => {
    await expect(validateUrl("https://public.example.com/api/v1")).resolves.not.toThrow();
    await expect(validateUrl("http://93.184.216.34/test")).resolves.not.toThrow();
  });

  it("blocks non-HTTP/HTTPS protocols", async () => {
    await expect(validateUrl("ftp://public.example.com")).rejects.toThrow(
      "Invalid protocol. Only http and https are allowed."
    );
    await expect(validateUrl("file:///etc/passwd")).rejects.toThrow(
      "Invalid protocol. Only http and https are allowed."
    );
  });

  it("blocks private IPv4 literals", async () => {
    await expect(validateUrl("http://127.0.0.1/admin")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://10.0.0.1/")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://172.16.0.1/")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://192.168.1.1/")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://169.254.169.254/latest/meta-data/")).rejects.toThrow(
      "Access to restricted IP"
    );
    await expect(validateUrl("http://0.0.0.0/")).rejects.toThrow("Access to restricted IP");
  });

  it("blocks reserved IPv4 ranges (CGNAT, Benchmarking, TEST-NET)", async () => {
    await expect(validateUrl("http://100.64.0.1/")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://198.18.0.1/")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://192.0.2.1/")).rejects.toThrow("Access to restricted IP");
  });

  it("blocks IPv6 loopback, unspecified, and private literals", async () => {
    await expect(validateUrl("http://[::1]/")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://[::]/")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://[fe80::1]/")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://[fc00::1]/")).rejects.toThrow("Access to restricted IP");
    await expect(validateUrl("http://[fd00::1]/")).rejects.toThrow("Access to restricted IP");
  });

  it("blocks IPv4-mapped IPv6 addresses (dotted decimal and hex format)", async () => {
    await expect(validateUrl("http://[::ffff:127.0.0.1]/")).rejects.toThrow(
      "Access to restricted IP"
    );
    await expect(validateUrl("http://[::ffff:7f00:1]/")).rejects.toThrow(
      "Access to restricted IP"
    );
    await expect(validateUrl("http://[::ffff:10.0.0.1]/")).rejects.toThrow(
      "Access to restricted IP"
    );
    await expect(validateUrl("http://[::ffff:a00:1]/")).rejects.toThrow(
      "Access to restricted IP"
    );
  });

  it("blocks hostnames that resolve to private IPs", async () => {
    await expect(validateUrl("http://internal.example.com/")).rejects.toThrow(
      "Access to restricted IP"
    );
    await expect(validateUrl("http://loopback.example.com/")).rejects.toThrow(
      "Access to restricted IP"
    );
  });

  it("throws error for unresolvable hostnames", async () => {
    await expect(validateUrl("http://unresolvable.example.invalid/")).rejects.toThrow(
      "Failed to resolve hostname"
    );
  });

  it("throws error for invalid URL strings", async () => {
    await expect(validateUrl("not-a-url")).rejects.toThrow("Invalid URL format");
  });
});
