import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActivityChart } from "@/components/user/activity-chart";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      contribution: "contribution",
      contributionsPlural: "contributions",
      inLastYear: "in the last year",
      inLast6Months: "in the last 6 months",
      less: "Less",
      more: "More",
    };
    return translations[key] || key;
  },
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("ActivityChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders total contributions and legend correctly", () => {
    const today = new Date().toISOString().split("T")[0];
    const data = [
      { date: today, count: 5 },
      { date: "2023-01-01", count: 2 },
    ];

    const { container } = render(<ActivityChart data={data} />);

    const header = container.querySelector(".text-muted-foreground.mb-3");
    expect(header?.textContent).toContain("5");
    expect(header?.textContent).toContain("contributions");
    expect(screen.getByText("Less")).toBeInTheDocument();
    expect(screen.getByText("More")).toBeInTheDocument();
  });

  it("handles empty activity data gracefully", () => {
    const { container } = render(<ActivityChart data={[]} />);

    const header = container.querySelector(".text-muted-foreground.mb-3");
    expect(header?.textContent).toContain("0");
    expect(header?.textContent).toContain("contributions");
  });

  it("calls onDateClick callback when a day cell is clicked", () => {
    const today = new Date().toISOString().split("T")[0];
    const data = [{ date: today, count: 3 }];
    const onDateClick = vi.fn();

    const { container } = render(
      <ActivityChart data={data} selectedDate={undefined} onDateClick={onDateClick} />
    );

    const cells = container.querySelectorAll(".cursor-pointer");
    expect(cells.length).toBeGreaterThan(0);

    fireEvent.click(cells[cells.length - 1]);
    expect(onDateClick).toHaveBeenCalled();
  });
});
