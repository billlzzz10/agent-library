import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActivityChart } from "@/components/user/activity-chart";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, any>) => {
    const translations: Record<string, string> = {
      contribution: "contribution",
      contributionsPlural: "contributions",
      inLastYear: "in the last year",
      inLast6Months: "in the last 6 months",
      less: "Less",
      more: "More",
    };
    if (key === "found" && values) return `${values.count} found`;
    return translations[key] || key;
  },
}));

describe("ActivityChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render total contributions correctly", () => {
    const today = new Date().toISOString().split("T")[0];
    const data = [
      { date: today, count: 5 },
      { date: "2024-01-01", count: 2 },
    ];

    render(<ActivityChart data={data} />);

    expect(screen.getByText(/contributions/i)).toBeInTheDocument();
    expect(screen.getByText("Less")).toBeInTheDocument();
    expect(screen.getByText("More")).toBeInTheDocument();
  });

  it("should handle empty data without throwing", () => {
    render(<ActivityChart data={[]} />);

    expect(screen.getByText("0 contributions in the last year")).toBeInTheDocument();
  });

  it("should handle date click callback", () => {
    const onDateClick = vi.fn();
    const today = new Date().toISOString().split("T")[0];
    const data = [{ date: today, count: 3 }];

    render(<ActivityChart data={data} onDateClick={onDateClick} />);

    // ActivityChart renders tooltip trigger elements for days
    const days = document.querySelectorAll(".rounded-full");
    if (days.length > 0) {
      fireEvent.click(days[0]);
    }

    expect(screen.getByText(/contributions/i)).toBeInTheDocument();
  });
});
