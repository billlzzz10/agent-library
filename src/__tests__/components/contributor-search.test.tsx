import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ContributorSearch } from "@/components/prompts/contributor-search";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      searchContributors: "Search contributors...",
      noUsersFound: "No users found",
    };
    return translations[key] || key;
  },
}));

describe("ContributorSearch", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
  });

  const sampleUsers = [
    { id: "u1", username: "alice", name: "Alice", avatar: null },
    { id: "u2", username: "bob", name: "Bob", avatar: null },
    { id: "u3", username: "charlie", name: "Charlie", avatar: null },
  ];

  it("renders selected contributors and handles removal", () => {
    const onRemove = vi.fn();
    const onSelect = vi.fn();

    render(
      <ContributorSearch
        selectedUsers={[sampleUsers[0]]}
        onSelect={onSelect}
        onRemove={onRemove}
      />
    );

    expect(screen.getByText("@alice")).toBeInTheDocument();

    const removeButton = screen.getByRole("button", { name: "" });
    fireEvent.click(removeButton);

    expect(onRemove).toHaveBeenCalledWith("u1");
  });

  it("searches users and filters out selected users without redundant API calls", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sampleUsers,
    });

    const onSelect = vi.fn();
    const onRemove = vi.fn();

    const { rerender } = render(
      <ContributorSearch
        selectedUsers={[sampleUsers[0]]} // u1 (alice) is selected
        onSelect={onSelect}
        onRemove={onRemove}
      />
    );

    const input = screen.getByPlaceholderText("Search contributors...");
    fireEvent.change(input, { target: { value: "a" } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/users/search?q=a");
    });

    // Should render dropdown buttons for bob and charlie, but NOT alice
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /@bob/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /@charlie/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /@alice/i })).toBeNull();
    });

    // Rerender with an updated selectedUsers list (e.g. parent selected bob)
    // Query did NOT change.
    rerender(
      <ContributorSearch
        selectedUsers={[sampleUsers[0], sampleUsers[1]]} // u1 and u2 selected
        onSelect={onSelect}
        onRemove={onRemove}
      />
    );

    // Filter updates immediately via useMemo without making another API call
    expect(screen.queryByRole("button", { name: /@bob/i })).toBeNull();
    expect(screen.getByRole("button", { name: /@charlie/i })).toBeInTheDocument();

    // Verify fetch was only called ONCE for query="a"
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
