import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmbedPage from "@/app/embed/page";
import { BrandingProvider } from "@/components/providers/branding-provider";

// Mock next/navigation useSearchParams
const mockGet = vi.fn();
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

const mockBranding = {
  name: "Prompts Chat",
  logo: "/logo.svg",
  logoDark: "/logo-dark.svg",
  description: "Prompt manager",
};

describe("EmbedPage", () => {
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

  it("renders mentions securely without dangerous HTML parsing", () => {
    mockGet.mockImplementation((key: string) => {
      if (key === "prompt") return "Hello @user1 check out <img src=x onerror=alert(1)> @user2";
      return null;
    });

    render(
      <BrandingProvider branding={mockBranding}>
        <EmbedPage />
      </BrandingProvider>
    );

    // Mentions should be rendered inside span with mention class
    const mention1 = screen.getByText("@user1");
    expect(mention1).toBeInTheDocument();
    expect(mention1.className).toContain("mention");

    const mention2 = screen.getByText("@user2");
    expect(mention2).toBeInTheDocument();
    expect(mention2.className).toContain("mention");

    // The script/img string should be rendered as literal text node, not HTML element
    expect(screen.getByText((content) => content.includes("<img src=x onerror=alert(1)>"))).toBeInTheDocument();
  });
});
