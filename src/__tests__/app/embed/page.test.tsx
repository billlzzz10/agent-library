import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import EmbedPage from "@/app/embed/page";
import { BrandingProvider } from "@/components/providers/branding-provider";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === "prompt") return "Hello @alice and <script>alert(1)</script> @bob";
      if (key === "themeMode") return "light";
      return null;
    },
  }),
}));

// Mock window.matchMedia
beforeEach(() => {
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

const mockBranding = {
  name: "Prompts Chat",
  logo: "/logo.svg",
  logoDark: "/logo-dark.svg",
  domain: "prompts.chat",
  primaryColor: "#3b82f6",
  darkColor: "#60a5fa",
};

describe("EmbedPage", () => {
  it("renders prompt text safely and highlights mentions as React elements", () => {
    render(
      <BrandingProvider branding={mockBranding as any}>
        <EmbedPage />
      </BrandingProvider>
    );

    // Verify mentions are rendered inside span.mention elements
    const mentionAlice = screen.getByText("@alice");
    expect(mentionAlice).toBeInTheDocument();
    expect(mentionAlice.tagName.toLowerCase()).toBe("span");
    expect(mentionAlice).toHaveClass("mention");

    const mentionBob = screen.getByText("@bob");
    expect(mentionBob).toBeInTheDocument();
    expect(mentionBob.tagName.toLowerCase()).toBe("span");
    expect(mentionBob).toHaveClass("mention");

    // Verify malicious HTML tags are treated as plain text, not parsed as DOM nodes
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeInTheDocument();
  });
});
