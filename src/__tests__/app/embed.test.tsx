import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import EmbedPage from "@/app/embed/page";
import { BrandingProvider } from "@/components/providers/branding-provider";

const mockSearchParams = new Map<string, string>();

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) || null,
  }),
}));

vi.mock("@/components/prompts/run-prompt-button", () => ({
  RunPromptButton: () => <button>Run</button>,
}));

describe("EmbedPage Security & Rendering", () => {
  beforeEach(() => {
    mockSearchParams.clear();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  const renderEmbed = () => {
    return render(
      <BrandingProvider
        branding={{
          name: "Test App",
          description: "Test Description",
          domain: "test.com",
          logoUrl: "/logo.svg",
          logoDarkUrl: "/logo-dark.svg",
          faviconUrl: "/favicon.ico",
          primaryColor: "#3b82f6",
          darkColor: "#60a5fa",
        }}
      >
        <EmbedPage />
      </BrandingProvider>
    );
  };

  it("renders mentions as spans with 'mention' class", () => {
    mockSearchParams.set("prompt", "Hello @user123, check this out");
    renderEmbed();

    const mention = screen.getByText("@user123");
    expect(mention).toBeInTheDocument();
    expect(mention.tagName.toLowerCase()).toBe("span");
    expect(mention).toHaveClass("mention");
  });

  it("safely renders XSS payloads as plain text without executing HTML", () => {
    const xssPayload = "<img src=x onerror=alert(1)> @attacker <script>alert(1)</script>";
    mockSearchParams.set("prompt", xssPayload);
    const { container } = renderEmbed();

    // Ensure no actual <img> or <script> element was created in the DOM
    expect(container.querySelector("img[src='x']")).toBeNull();
    expect(container.querySelector("script")).toBeNull();

    // Ensure mention is rendered safely as span
    const mention = screen.getByText("@attacker");
    expect(mention).toBeInTheDocument();
    expect(mention.tagName.toLowerCase()).toBe("span");
    expect(mention).toHaveClass("mention");

    // Ensure raw XSS string exists as plain text inside prompt container
    expect(screen.getByText(/<img src=x onerror=alert\(1\)>/)).toBeInTheDocument();
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeInTheDocument();
  });
});
