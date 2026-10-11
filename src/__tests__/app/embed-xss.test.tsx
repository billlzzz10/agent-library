import { render, screen } from "@testing-library/react";
import EmbedPage from "@/app/embed/page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => {
    const params = new Map();
    params.set("prompt", "Hello @user1! <script>alert('xss')</script> <img src=x onerror=alert(1)> @user2");
    params.set("themeMode", "light");
    return {
      get: (key: string) => params.get(key) || null,
    };
  },
}));

// Mock RunPromptButton to simplify rendering
vi.mock("@/components/prompts/run-prompt-button", () => ({
  RunPromptButton: () => <button>Run</button>,
}));

describe("EmbedPage XSS Prevention", () => {
  it("renders mentions as spans and renders malicious HTML safely as plain text", () => {
    const { container } = render(<EmbedPage />);

    // Mentions should be rendered inside span.mention elements
    const mentionElements = container.querySelectorAll("span.mention");
    expect(mentionElements.length).toBe(2);
    expect(mentionElements[0].textContent).toBe("@user1");
    expect(mentionElements[1].textContent).toBe("@user2");

    // Script tags and img onerror payloads must NOT be injected into the DOM as HTML elements
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img[src='x']")).toBeNull();

    // The raw text content should contain the literal string without execution/injection
    expect(screen.getByText(/<script>alert\('xss'\)<\/script>/)).toBeInTheDocument();
    expect(screen.getByText(/<img src=x onerror=alert\(1\)>/)).toBeInTheDocument();
  });
});
