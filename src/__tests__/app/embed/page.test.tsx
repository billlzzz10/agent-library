import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import EmbedPage from "@/app/embed/page";
import { BrandingProvider } from "@/components/providers/branding-provider";

// Mock next/navigation
const mockSearchParams = new Map<string, string>();
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) || null,
  }),
}));

const mockBranding = {
  appName: "TestApp",
  logoUrl: "/logo.svg",
  logoDarkUrl: "/logo-dark.svg",
  primaryColor: "#000000",
};

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrandingProvider branding={mockBranding}>
      {ui}
    </BrandingProvider>
  );
}

// Mock window.matchMedia
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

describe("EmbedPage", () => {
  it("renders prompt text with @mentions highlighted as JSX span elements", () => {
    mockSearchParams.set("prompt", "Hello @user check out @prompt!");

    const { container } = renderWithProviders(<EmbedPage />);

    // Verify mention elements
    const mentions = container.querySelectorAll(".mention");
    expect(mentions.length).toBe(2);
    expect(mentions[0].textContent).toBe("@user");
    expect(mentions[1].textContent).toBe("@prompt");
  });

  it("renders unsafe HTML input strictly as text nodes without executing/rendering raw HTML tags", () => {
    mockSearchParams.set(
      "prompt",
      "<script>alert('xss')</script> <img src=x onerror=alert(1)> @admin"
    );

    const { container } = renderWithProviders(<EmbedPage />);

    // Check that mention is parsed
    const mentions = container.querySelectorAll(".mention");
    expect(mentions.length).toBe(1);
    expect(mentions[0].textContent).toBe("@admin");

    // Ensure script tags and img tags were not rendered as HTML DOM elements
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img[src='x']")).toBeNull();

    // Verify raw text is rendered as plain text within the prompt paragraph
    expect(screen.getByText(/<script>alert\('xss'\)<\/script>/)).toBeInTheDocument();
  });
});
