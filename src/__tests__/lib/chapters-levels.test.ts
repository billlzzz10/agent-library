import { describe, it, expect } from "vitest";
import {
  getAllChapters,
  getChapterBySlug,
  getAdjacentChapters,
} from "@/lib/book/chapters";
import {
  getAllLevels,
  getLevelBySlug,
  getWorldByNumber,
  getAdjacentLevels,
  getLevelIndex,
  getTotalLevels,
} from "@/lib/kids/levels";

describe("book chapters utility", () => {
  it("getAllChapters returns all chapters in order", () => {
    const chapters = getAllChapters();
    expect(chapters.length).toBeGreaterThan(0);
    expect(chapters[0].slug).toBe("00a-preface");
  });

  it("getChapterBySlug retrieves existing chapter", () => {
    const chapter = getChapterBySlug("00a-preface");
    expect(chapter).toBeDefined();
    expect(chapter?.title).toBe("Preface");

    const chapterLast = getChapterBySlug("24-future-of-prompting");
    expect(chapterLast).toBeDefined();
    expect(chapterLast?.title).toBe("The Future of Prompting");
  });

  it("getChapterBySlug returns undefined for non-existent slug", () => {
    const chapter = getChapterBySlug("invalid-slug-123");
    expect(chapter).toBeUndefined();
  });

  it("getAdjacentChapters returns correct previous and next chapters", () => {
    const chapters = getAllChapters();
    const firstChapterSlug = chapters[0].slug;
    const secondChapterSlug = chapters[1].slug;
    const lastChapterSlug = chapters[chapters.length - 1].slug;

    const firstAdjacent = getAdjacentChapters(firstChapterSlug);
    expect(firstAdjacent.prev).toBeUndefined();
    expect(firstAdjacent.next?.slug).toBe(secondChapterSlug);

    const midAdjacent = getAdjacentChapters(secondChapterSlug);
    expect(midAdjacent.prev?.slug).toBe(firstChapterSlug);
    expect(midAdjacent.next).toBeDefined();

    const lastAdjacent = getAdjacentChapters(lastChapterSlug);
    expect(lastAdjacent.prev).toBeDefined();
    expect(lastAdjacent.next).toBeUndefined();

    const invalidAdjacent = getAdjacentChapters("invalid-slug");
    expect(invalidAdjacent.prev).toBeUndefined();
    expect(invalidAdjacent.next).toBeUndefined();
  });
});

describe("kids levels utility", () => {
  it("getAllLevels returns all levels", () => {
    const levels = getAllLevels();
    expect(levels.length).toBeGreaterThan(0);
    expect(levels[0].slug).toBe("1-1-meet-promi");
  });

  it("getLevelBySlug retrieves existing level", () => {
    const level = getLevelBySlug("1-1-meet-promi");
    expect(level).toBeDefined();
    expect(level?.world).toBe(1);

    const levelLast = getLevelBySlug("5-4-graduation-day");
    expect(levelLast).toBeDefined();
    expect(levelLast?.world).toBe(5);
  });

  it("getLevelBySlug returns undefined for non-existent slug", () => {
    const level = getLevelBySlug("non-existent");
    expect(level).toBeUndefined();
  });

  it("getWorldByNumber retrieves world by number", () => {
    const world1 = getWorldByNumber(1);
    expect(world1).toBeDefined();
    expect(world1?.slug).toBe("starter-village");

    const invalidWorld = getWorldByNumber(99);
    expect(invalidWorld).toBeUndefined();
  });

  it("getAdjacentLevels returns correct adjacent levels", () => {
    const levels = getAllLevels();
    const firstSlug = levels[0].slug;
    const secondSlug = levels[1].slug;
    const lastSlug = levels[levels.length - 1].slug;

    const firstAdjacent = getAdjacentLevels(firstSlug);
    expect(firstAdjacent.prev).toBeUndefined();
    expect(firstAdjacent.next?.slug).toBe(secondSlug);

    const lastAdjacent = getAdjacentLevels(lastSlug);
    expect(lastAdjacent.prev).toBeDefined();
    expect(lastAdjacent.next).toBeUndefined();

    const invalidAdjacent = getAdjacentLevels("invalid-slug");
    expect(invalidAdjacent.prev).toBeUndefined();
    expect(invalidAdjacent.next).toBeUndefined();
  });

  it("getLevelIndex returns correct index or -1", () => {
    expect(getLevelIndex("1-1-meet-promi")).toBe(0);
    expect(getLevelIndex("non-existent")).toBe(-1);
  });

  it("getTotalLevels returns total count of levels", () => {
    expect(getTotalLevels()).toBe(getAllLevels().length);
  });
});
