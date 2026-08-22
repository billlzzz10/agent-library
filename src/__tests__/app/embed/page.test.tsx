import { render, screen } from "@testing-library/react";
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

describe("EmbedPage", () => {
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

  const mockBranding = {
    name: "Test",
    logo: "/logo.svg",
    logoDark: "/logo-dark.svg",
    icon: "/icon.svg",
    domain: "test.com",
    primaryColor: "#000000",
    description: "Test description",
  };

  it("renders mentions highlighted safely and escapes raw HTML elements", () => {
    const maliciousPrompt = "Hello @alice! Check out <script>alert(1)</script> and <b>bold text</b>.";
    mockSearchParams.set("prompt", maliciousPrompt);

    render(
      <BrandingProvider branding={mockBranding}>
        <EmbedPage />
      </BrandingProvider>
    );

    const mentionEl = screen.getByText("@alice");
    expect(mentionEl).toBeInTheDocument();
    expect(mentionEl.className).toBe("mention");

    // Script tag and bold tag text should be literal text, not parsed HTML elements
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeInTheDocument();
    expect(screen.getByText(/<b>bold text<\/b>/)).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
    expect(document.querySelector("b")).toBeNull();
  });
});
