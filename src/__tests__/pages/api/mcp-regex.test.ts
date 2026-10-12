import { describe, it, expect } from "vitest";

// Re-implement or test the escapeRegex and variable replacement logic matching src/pages/api/mcp.ts
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceVariables(
  content: string,
  variables: Array<{ name: string; defaultValue?: string }>,
  args: Record<string, string>
): string {
  let filledContent = content;
  for (const variable of variables) {
    const value = args[variable.name] ?? variable.defaultValue ?? `\${${variable.name}}`;
    filledContent = filledContent.replace(
      new RegExp(`\\$\\{${escapeRegex(variable.name)}(?::[^}]*)?\\}`, "g"),
      String(value)
    );
  }
  return filledContent;
}

describe("MCP Regex escaping and variable replacement", () => {
  it("escapes special regex characters in variable names properly", () => {
    const specialNames = ["foo.bar", "var+1", "val*", "[key]", "(group)", "a|b", "x?y", "a$b", "^top"];

    for (const name of specialNames) {
      const content = `Hello \${${name}}!`;
      const variables = [{ name }];
      const args = { [name]: "SUCCESS" };

      expect(() => replaceVariables(content, variables, args)).not.toThrow();
      expect(replaceVariables(content, variables, args)).toBe("Hello SUCCESS!");
    }
  });

  it("replaces default values correctly even with special regex characters in variable name", () => {
    const content = "Code: ${user.name:defaultUser}";
    const variables = [{ name: "user.name", defaultValue: "defaultUser" }];
    const args = {};

    const result = replaceVariables(content, variables, args);
    expect(result).toBe("Code: defaultUser");
  });
});
