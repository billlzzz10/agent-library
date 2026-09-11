import { describe, it, expect } from "vitest";
import {
  parseSkillFiles,
  serializeSkillFiles,
  getLanguageFromFilename,
  validateFilename,
  generateSkillContentWithFrontmatter,
  parseSkillFrontmatter,
  updateSkillFrontmatter,
  validateSkillFrontmatter,
  isValidKebabCase,
  suggestFilename,
  DEFAULT_SKILL_FILE,
  DEFAULT_SKILL_CONTENT,
} from "@/lib/skill-files";

describe("skill-files utility functions", () => {
  describe("parseSkillFiles & serializeSkillFiles", () => {
    it("should handle empty or whitespace content", () => {
      const files = parseSkillFiles("");
      expect(files).toHaveLength(1);
      expect(files[0].filename).toBe(DEFAULT_SKILL_FILE);
      expect(files[0].content).toBe(DEFAULT_SKILL_CONTENT);
    });

    it("should parse single skill file without separators", () => {
      const content = "Hello World";
      const files = parseSkillFiles(content);
      expect(files).toEqual([{ filename: DEFAULT_SKILL_FILE, content: "Hello World" }]);
    });

    it("should parse multi-file content separated by control characters", () => {
      const file1 = "Content 1";
      const file2 = "Content 2";
      const serialized = `${file1}\n\x1FFILE:helper.ts\x1E\n${file2}`;

      const files = parseSkillFiles(serialized);
      expect(files).toEqual([
        { filename: DEFAULT_SKILL_FILE, content: file1 },
        { filename: "helper.ts", content: file2 },
      ]);
    });

    it("should roundtrip serialize and parse skill files", () => {
      const initialFiles = [
        { filename: DEFAULT_SKILL_FILE, content: "# Primary Skill" },
        { filename: "utils/math.ts", content: "export const add = (a: number, b: number) => a + b;" },
      ];

      const serialized = serializeSkillFiles(initialFiles);
      const parsed = parseSkillFiles(serialized);

      expect(parsed).toEqual(initialFiles);
    });

    it("should fallback to default content when serializing empty list", () => {
      expect(serializeSkillFiles([])).toBe(DEFAULT_SKILL_CONTENT);
    });
  });

  describe("getLanguageFromFilename", () => {
    it("should correctly identify common file extension languages", () => {
      expect(getLanguageFromFilename("script.ts")).toBe("typescript");
      expect(getLanguageFromFilename("app.tsx")).toBe("typescript");
      expect(getLanguageFromFilename("index.js")).toBe("javascript");
      expect(getLanguageFromFilename("style.css")).toBe("css");
      expect(getLanguageFromFilename("config.json")).toBe("json");
      expect(getLanguageFromFilename("document.md")).toBe("markdown");
      expect(getLanguageFromFilename("query.sql")).toBe("sql");
      expect(getLanguageFromFilename("script.py")).toBe("python");
    });

    it("should handle special filenames like Dockerfile and Makefile", () => {
      expect(getLanguageFromFilename("Dockerfile")).toBe("dockerfile");
      expect(getLanguageFromFilename("dockerfile.prod")).toBe("dockerfile");
      expect(getLanguageFromFilename("Makefile")).toBe("makefile");
      expect(getLanguageFromFilename("gnumakefile")).toBe("makefile");
    });

    it("should default unknown extensions to plaintext", () => {
      expect(getLanguageFromFilename("unknown.xyz")).toBe("plaintext");
      expect(getLanguageFromFilename("no-ext")).toBe("plaintext");
    });
  });

  describe("validateFilename", () => {
    it("should detect invalid/empty filenames and invalid patterns", () => {
      expect(validateFilename("", [])).toBe("filenameEmpty");
      expect(validateFilename("   ", [])).toBe("filenameEmpty");
      expect(validateFilename("file<name>.txt", [])).toBe("filenameInvalidChars");
      expect(validateFilename("file?.txt", [])).toBe("filenameInvalidChars");
      expect(validateFilename("/start-slash.ts", [])).toBe("pathStartEndSlash");
      expect(validateFilename("end-slash/", [])).toBe("pathStartEndSlash");
      expect(validateFilename("double//slash.ts", [])).toBe("pathConsecutiveSlashes");
      expect(validateFilename("path/../file.ts", [])).toBe("pathContainsDotDot");
      expect(validateFilename(DEFAULT_SKILL_FILE, [])).toBe("filenameReserved");
    });

    it("should detect duplicate filenames regardless of case", () => {
      expect(validateFilename("Helper.ts", ["helper.ts"])).toBe("filenameDuplicate");
      expect(validateFilename("helper.ts", ["Helper.ts"])).toBe("filenameDuplicate");
    });

    it("should pass for valid filename and path", () => {
      expect(validateFilename("utils/math.ts", ["other.ts"])).toBeNull();
    });
  });

  describe("isValidKebabCase", () => {
    it("should validate kebab-case formatted strings", () => {
      expect(isValidKebabCase("valid-skill-name")).toBe(true);
      expect(isValidKebabCase("skill123")).toBe(true);
      expect(isValidKebabCase("InvalidName")).toBe(false);
      expect(isValidKebabCase("invalid_name")).toBe(false);
      expect(isValidKebabCase("123-skill")).toBe(false);
      expect(isValidKebabCase("-skill")).toBe(false);
    });
  });

  describe("transliteration & skill content generation", () => {
    it("should transliterate special characters and accents in title to kebab-case", () => {
      const title = "Çalışma & Türkçe Şablon (Örnek) ß";
      const desc = "A test description";
      const content = generateSkillContentWithFrontmatter(title, desc);

      const parsed = parseSkillFrontmatter(content);
      expect(parsed?.name).toBe("calisma-turkce-sablon-ornek-ss");
      expect(parsed?.description).toBe(desc);
    });

    it("should update existing frontmatter cleanly", () => {
      const initial = generateSkillContentWithFrontmatter("Old Skill", "Old Description");
      const updated = updateSkillFrontmatter(initial, "New Skill", "New Description");

      const parsed = parseSkillFrontmatter(updated);
      expect(parsed?.name).toBe("new-skill");
      expect(parsed?.description).toBe("New Description");
    });

    it("should validate skill frontmatter required fields", () => {
      const validContent = generateSkillContentWithFrontmatter("Valid Title", "Valid description for the skill");
      expect(validateSkillFrontmatter(validContent)).toBeNull();

      expect(validateSkillFrontmatter("no frontmatter here")).toBe("frontmatterMissing");
      expect(validateSkillFrontmatter(DEFAULT_SKILL_CONTENT)).toBe("frontmatterNameRequired");
    });
  });

  describe("suggestFilename", () => {
    it("should suggest available standard filename", () => {
      expect(suggestFilename([])).toBe("README.md");
      expect(suggestFilename(["README.md"])).toBe("config.json");
    });

    it("should fallback to fileN.md if common suggestions are taken", () => {
      const taken = [
        "README.md",
        "config.json",
        "schema.json",
        "template.md",
        "example.ts",
        "utils.ts",
        "types.ts",
        "constants.ts",
      ];
      expect(suggestFilename(taken)).toBe("file1.md");
      expect(suggestFilename([...taken, "file1.md"])).toBe("file2.md");
    });
  });
});
