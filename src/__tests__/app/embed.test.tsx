import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EmbedPage from "@/app/embed/page";
import { BrandingProvider } from "@/components/providers/branding-provider";

// Mock next/navigation searchParams
const mockSearchParams = new Map<string, string>();

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) || null,
  }),
}));

// Mock window.matchMedia
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

const mockBranding = {
  name: "prompts.chat",
  logo: "/logo.svg",
  logoDark: "/logo-dark.svg",
  description: "Prompt library",
  logoUrl: "/logo.svg",
  logoDarkUrl: "/logo-dark.svg",
  faviconUrl: "/favicon.ico",
  domain: "prompts.chat",
  supportEmail: "support@prompts.chat",
};

describe("EmbedPage XSS and Mention Rendering", () => {
  it("renders mentions properly as span elements", async () => {
    mockSearchParams.set("prompt", "Hello @jules welcome to @sentinel!");

    render(
      <BrandingProvider branding={mockBranding}>
        <EmbedPage />
      </BrandingProvider>
    );

    const mentions = screen.getAllByText(/@\w+/);
    expect(mentions).toHaveLength(2);
    expect(mentions[0].textContent).toBe("@jules");
    expect(mentions[0].className).toBe("mention");
    expect(mentions[1].textContent).toBe("@sentinel");
    expect(mentions[1].className).toBe("mention");
  });

  it("safely escapes HTML tags and prevents script injection in prompt parameter", async () => {
    mockSearchParams.set(
      "prompt",
      "<script>alert('xss')</script><img src=x onerror=alert(1)> @user"
    );

    render(
      <BrandingProvider branding={mockBranding}>
        <EmbedPage />
      </BrandingProvider>
    );

    // Script or img tags should not be rendered as DOM elements
    expect(document.querySelector("script")).toBeNull();
    expect(document.querySelector("img[src='x']")).toBeNull();

    // Raw text should be visible as text content, safely escaped
    expect(
      screen.getByText((content) =>
        content.includes("<script>alert('xss')</script><img src=x onerror=alert(1)>")
      )
    ).toBeInTheDocument();

    const mention = screen.getByText("@user");
    expect(mention).toBeInTheDocument();
    expect(mention.className).toBe("mention");
  });
});
