import { describe, it, expect } from "vitest";
import { executeToolCall, PromptBuilderState } from "@/lib/ai/prompt-builder-tools";

describe("prompt-builder-tools executeToolCall", () => {
  const initialState: PromptBuilderState = {
    title: "",
    description: "",
    content: "",
    type: "TEXT",
    tagIds: [],
    isPrivate: false,
    requiresMediaUpload: false,
  };

  const sampleTags = [
    { id: "tag-1", name: "Coding", slug: "coding", color: "#ff0000" },
    { id: "tag-2", name: "Writing", slug: "writing", color: "#00ff00" },
  ];

  const sampleCategories = [
    { id: "cat-1", name: "Development", slug: "development", parentId: null },
    { id: "cat-2", name: "Marketing", slug: "marketing", parentId: null },
  ];

  it("should set tags correctly using Map and Set", async () => {
    const { result, newState } = await executeToolCall(
      "set_tags",
      { tagNames: ["Coding", "nonexistent"] },
      initialState,
      sampleTags,
      sampleCategories
    );

    expect(result.success).toBe(true);
    expect((result.data as any).appliedTags).toEqual(["Coding"]);
    expect((result.data as any).notFound).toEqual(["nonexistent"]);
    expect(newState.tagIds).toEqual(["tag-1"]);
  });

  it("should set category correctly using Map lookup", async () => {
    const { result, newState } = await executeToolCall(
      "set_category",
      { categoryName: "development" },
      initialState,
      sampleTags,
      sampleCategories
    );

    expect(result.success).toBe(true);
    expect((result.data as any).category).toBe("Development");
    expect(newState.categoryId).toBe("cat-1");
  });

  it("should get current state correctly with Map lookups", async () => {
    const state: PromptBuilderState = {
      ...initialState,
      title: "Test Title",
      categoryId: "cat-2",
      tagIds: ["tag-1", "tag-2"],
    };

    const { result } = await executeToolCall(
      "get_current_state",
      {},
      state,
      sampleTags,
      sampleCategories
    );

    expect(result.success).toBe(true);
    expect((result.data as any).category).toBe("Marketing");
    expect((result.data as any).tags).toEqual(["Coding", "Writing"]);
  });
});
