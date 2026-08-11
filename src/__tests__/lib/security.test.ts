import { vi, describe, it, expect } from "vitest";
import { validateUrl } from "@/lib/security";

vi.mock("dns/promises", () => {
  const lookupFn = async (hostname: string) => {
    if (hostname === "localhost" || hostname === "loopback") {
      return { address: "127.0.0.1" };
    }
    if (hostname === "private.local" || hostname === "internal.service") {
      return { address: "10.0.0.5" };
    }
    if (hostname === "example.com" || hostname === "google.com") {
      return { address: "93.184.216.34" }; // Public IP
    }
    throw new Error("ENOTFOUND");
  };

  return {
    default: {
      lookup: lookupFn,
    },
    lookup: lookupFn,
  };
});

describe("validateUrl Utility for SSRF Protection", () => {
  it("should allow valid public URLs with http/https protocols", async () => {
    await expect(validateUrl("https://example.com/image.png")).resolves.not.toThrow();
    await expect(validateUrl("http://google.com/search")).resolves.not.toThrow();
  });

  it("should throw error for invalid URL formats", async () => {
    await expect(validateUrl("not-a-url")).rejects.toThrow("Invalid URL format");
    await expect(validateUrl("http://")).rejects.toThrow("Invalid URL format");
  });

  it("should throw error for unsupported protocols", async () => {
    await expect(validateUrl("ftp://example.com/file")).rejects.toThrow(
      "Invalid protocol. Only http and https are allowed."
    );
    await expect(validateUrl("file:///etc/passwd")).rejects.toThrow(
      "Invalid protocol. Only http and https are allowed."
    );
    await expect(validateUrl("gopher://example.com")).rejects.toThrow(
      "Invalid protocol. Only http and https are allowed."
    );
  });

  it("should block loopback and private IP literals", async () => {
    await expect(validateUrl("http://127.0.0.1/status")).rejects.toThrow(
      "Access to restricted IP address 127.0.0.1 is forbidden."
    );
    await expect(validateUrl("https://10.1.2.3/api")).rejects.toThrow(
      "Access to restricted IP address 10.1.2.3 is forbidden."
    );
    await expect(validateUrl("http://192.168.1.50/info")).rejects.toThrow(
      "Access to restricted IP address 192.168.1.50 is forbidden."
    );
    await expect(validateUrl("http://172.16.4.5/test")).rejects.toThrow(
      "Access to restricted IP address 172.16.4.5 is forbidden."
    );
    await expect(validateUrl("http://0.0.0.0/")).rejects.toThrow(
      "Access to restricted IP address 0.0.0.0 is forbidden."
    );
  });

  it("should allow safe public IP literals", async () => {
    // 8.8.8.8 is public and valid
    await expect(validateUrl("https://8.8.8.8/")).resolves.not.toThrow();
  });

  it("should block hostnames resolving to private IPs", async () => {
    await expect(validateUrl("http://localhost/path")).rejects.toThrow(
      "Access to restricted IP address 127.0.0.1 (resolved from localhost) is forbidden."
    );
    await expect(validateUrl("https://private.local/api")).rejects.toThrow(
      "Access to restricted IP address 10.0.0.5 (resolved from private.local) is forbidden."
    );
  });

  it("should block IPv6 loopback and private IP literals", async () => {
    await expect(validateUrl("http://[::1]/")).rejects.toThrow(
      "Access to restricted IP address [::1] is forbidden."
    );
    await expect(validateUrl("http://[fe80::1]/")).rejects.toThrow(
      "Access to restricted IP address [fe80::1] is forbidden."
    );
    await expect(validateUrl("http://[fc00::]/")).rejects.toThrow(
      "Access to restricted IP address [fc00::] is forbidden."
    );
  });

  it("should throw error if DNS lookup fails", async () => {
    await expect(validateUrl("https://nonexistent-domain.xyz/")).rejects.toThrow(
      "Failed to resolve hostname: nonexistent-domain.xyz"
    );
  });
});
