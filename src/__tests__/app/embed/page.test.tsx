import { describe, it, expect, vi } from "vitest";
import { buildFileTree } from "@/app/embed/page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === "prompt") return "Test prompt @user";
      if (key === "filetree") return "src/index.ts\nsrc/utils/helpers.ts\nREADME.md\nsrc/components/";
      if (key === "context") return "##image:TestImage,@user,http://example.com";
      return null;
    },
  }),
}));

describe("Embed Page buildFileTree", () => {
  it("builds a hierarchical file tree from flat path strings", () => {
    const paths = [
      "src/index.ts",
      "src/utils/helpers.ts",
      "README.md",
      "src/components/",
    ];

    const tree = buildFileTree(paths);

    // Folders first (src), then files (README.md)
    expect(tree).toHaveLength(2);
    expect(tree[0].name).toBe("src");
    expect(tree[0].path).toBe("src/");
    expect(tree[0].isFolder).toBe(true);
    expect(tree[1].name).toBe("README.md");
    expect(tree[1].path).toBe("README.md");
    expect(tree[1].isFolder).toBe(false);

    // Check src folder children (folders first: components, utils; then files: index.ts)
    const srcChildren = tree[0].children;
    expect(srcChildren).toHaveLength(3);
    expect(srcChildren[0].name).toBe("components");
    expect(srcChildren[0].path).toBe("src/components/");
    expect(srcChildren[0].isFolder).toBe(true);

    expect(srcChildren[1].name).toBe("utils");
    expect(srcChildren[1].path).toBe("src/utils/");
    expect(srcChildren[1].isFolder).toBe(true);

    expect(srcChildren[2].name).toBe("index.ts");
    expect(srcChildren[2].path).toBe("src/index.ts");
    expect(srcChildren[2].isFolder).toBe(false);
  });

  it("handles empty paths array gracefully", () => {
    const tree = buildFileTree([]);
    expect(tree).toEqual([]);
  });

  it("handles single-level files correctly", () => {
    const paths = ["b.txt", "a.txt", "docs/"];
    const tree = buildFileTree(paths);

    expect(tree).toHaveLength(3);
    expect(tree[0].name).toBe("docs");
    expect(tree[0].path).toBe("docs/");
    expect(tree[0].isFolder).toBe(true);

    expect(tree[1].name).toBe("a.txt");
    expect(tree[1].path).toBe("a.txt");
    expect(tree[1].isFolder).toBe(false);

    expect(tree[2].name).toBe("b.txt");
    expect(tree[2].path).toBe("b.txt");
    expect(tree[2].isFolder).toBe(false);
  });
});
