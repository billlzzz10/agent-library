/**
 * Variable Detection Utility
 * Detects common variable-like patterns in text that could be converted
 * to our supported format: ${variableName} or ${variableName:default}
 */

export interface DetectedVariable {
  original: string;
  name: string;
  defaultValue?: string;
  pattern: VariablePattern;
  startIndex: number;
  endIndex: number;
}

export type VariablePattern =
  | "double_bracket" // [[name]] or [[ name ]]
  | "double_curly" // {{name}} or {{ name }}
  | "single_bracket" // [NAME] or [name]
  | "single_curly" // {NAME} or {name}
  | "angle_bracket" // <NAME> or <name>
  | "percent" // %NAME% or %name%
  | "dollar_curly"; // ${name} (already our format)

interface PatternConfig {
  pattern: VariablePattern;
  regex: RegExp;
  extractName: (match: RegExpExecArray) => string;
  extractDefault?: (match: RegExpExecArray) => string | undefined;
}

// Patterns to detect, ordered by specificity (more specific first)
const PATTERNS: PatternConfig[] = [
  // Double bracket: [[name]] or [[ name ]] or [[name: default]]
  {
    pattern: "double_bracket",

    regex: /\[\[\s*([a-zA-Z_][a-zA-Z0-9_\s]*?)(?:\s*:\s*([^\]]*?))?\s*\]\]/g,
    extractName: (m) => m[1].trim(),
    extractDefault: (m) => m[2]?.trim(),
  },
  // Double curly: {{name}} or {{ name }} or {{name: default}}
  {
    pattern: "double_curly",

    regex: /\{\{\s*([a-zA-Z_][a-zA-Z0-9_\s]*?)(?:\s*:\s*([^}]*?))?\s*\}\}/g,
    extractName: (m) => m[1].trim(),
    extractDefault: (m) => m[2]?.trim(),
  },
  // Our supported format (to exclude from warnings)
  {
    pattern: "dollar_curly",
    regex: /\$\{([a-zA-Z_][a-zA-Z0-9_\s]*?)(?::([^}]*))?\}/g,
    extractName: (m) => m[1].trim(),
  },
  // Single bracket with uppercase or placeholder-like: [NAME] or [Your Name]
  {
    pattern: "single_bracket",
    regex: /\[([A-Z][A-Z0-9_\s]*|[A-Za-z][a-zA-Z0-9_]*(?:\s+[A-Za-z][a-zA-Z0-9_]*)*)\]/g,
    extractName: (m) => m[1].trim(),
  },
  // Single curly with uppercase: {NAME} or {Your Name}
  {
    pattern: "single_curly",

    regex: /\{([A-Z][A-Z0-9_\s]*|[A-Za-z][a-zA-Z0-9_]*(?:\s+[A-Za-z][a-zA-Z0-9_]*)*)\}/g,
    extractName: (m) => m[1].trim(),
  },
  // Angle brackets: <NAME> or <name>
  {
    pattern: "angle_bracket",

    regex: /<([A-Z][A-Z0-9_\s]*|[a-zA-Z_][a-zA-Z0-9_\s]*)>/g,
    extractName: (m) => m[1].trim(),
  },
  // Percent signs: %NAME% or %name%
  {
    pattern: "percent",

    regex: /%([a-zA-Z_][a-zA-Z0-9_]*)%/g,
    extractName: (m) => m[1].trim(),
  },
];

// Common false positives to ignore
const FALSE_POSITIVES = new Set([
  // HTML/XML common tags
  "div",
  "span",
  "p",
  "a",
  "br",
  "hr",
  "img",
  "input",
  "button",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "table",
  "tr",
  "td",
  "th",
  "thead",
  "tbody",
  "form",
  "label",
  "select",
  "option",
  "textarea",
  "script",
  "style",
  "link",
  "meta",
  "head",
  "body",
  "html",
  "section",
  "article",
  "nav",
  "header",
  "footer",
  "main",
  "aside",
  "figure",
  "figcaption",
  "strong",
  "em",
  "code",
  "pre",
  "blockquote",
  "cite",
  "abbr",
  "address",
  "b",
  "i",
  "u",
  // Common programming constructs
  "if",
  "else",
  "for",
  "while",
  "switch",
  "case",
  "break",
  "return",
  "function",
  "class",
  "const",
  "let",
  "var",
  "import",
  "export",
  "default",
  "try",
  "catch",
  "finally",
  "throw",
  "new",
  "this",
  "null",
  "undefined",
  "true",
  "false",
  "typeof",
  "instanceof",
  // JSON structure keywords (when in context)
  "type",
  "id",
  "key",
  "value",
  "data",
  "items",
  "properties",
]);

/**
 * Creates a lazy quote indexer to check if a character index is inside a JSON string context.
 * This avoids rescanning the entire string prefix from index 0 for every match.
 */
function getJsonStringChecker(text: string) {
  let quoteIndices: number[] | null = null;

  return function isInsideJsonString(index: number): boolean {
    if (quoteIndices === null) {
      quoteIndices = [];
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '"' && (i === 0 || text[i - 1] !== "\\")) {
          quoteIndices.push(i);
        }
      }
    }
    let count = 0;
    for (let i = 0; i < quoteIndices.length; i++) {
      if (quoteIndices[i] < index) {
        count++;
      } else {
        break;
      }
    }
    return count % 2 === 1;
  };
}

/**
 * Detect variable-like patterns in text
 * Returns detected variables that are NOT in our supported format
 */
export function detectVariables(text: string): DetectedVariable[] {
  const detected: DetectedVariable[] = [];
  const seenRanges: Array<[number, number]> = [];

  // Track our supported format positions to exclude them
  const supportedVars = new Set<string>();

  const dollarCurlyPattern = /\$\{([a-zA-Z_][a-zA-Z0-9_\s]*?)(?::([^}]*))?\}/g;
  let match: RegExpExecArray | null;

  while ((match = dollarCurlyPattern.exec(text)) !== null) {
    seenRanges.push([match.index, match.index + match[0].length]);
    supportedVars.add(match[0]);
  }

  const isInsideJson = getJsonStringChecker(text);

  // Check each pattern
  for (const config of PATTERNS) {
    // Skip our supported format pattern for detection
    if (config.pattern === "dollar_curly") continue;

    const regex = config.regex;
    regex.lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      const startIndex = match.index;
      const endIndex = startIndex + match[0].length;

      // Check if this range overlaps with any already detected range
      const overlaps = seenRanges.some(
        ([start, end]) =>
          (startIndex >= start && startIndex < end) || (endIndex > start && endIndex <= end)
      );

      if (overlaps) continue;

      const name = config.extractName(match);

      // Skip false positives
      if (FALSE_POSITIVES.has(name.toLowerCase())) continue;

      // Skip very short names (likely not variables)
      if (name.length < 2) continue;

      // For angle brackets, be more strict - require uppercase or specific patterns
      if (config.pattern === "angle_bracket") {
        // Check if it looks like HTML (has attributes or is lowercase single word)
        if (!/^[A-Z]/.test(name) && !name.includes(" ")) continue;
      }

      // For single curly/bracket in JSON context, be more careful
      if (
        (config.pattern === "single_curly" || config.pattern === "single_bracket") &&
        isInsideJson(startIndex)
      ) {
        // Only detect if it's clearly a placeholder (uppercase or has spaces)
        if (!/^[A-Z]/.test(name) && !name.includes(" ")) continue;
      }

      // Extract default value if the pattern supports it
      const defaultValue = config.extractDefault?.(match);

      detected.push({
        original: match[0],
        name,
        defaultValue,
        pattern: config.pattern,
        startIndex,
        endIndex,
      });

      seenRanges.push([startIndex, endIndex]);
    }
  }

  // Sort by position and remove duplicates
  return detected
    .sort((a, b) => a.startIndex - b.startIndex)
    .filter(
      (v, i, arr) =>
        i === 0 || v.original !== arr[i - 1].original || v.startIndex !== arr[i - 1].startIndex
    );
}

/**
 * Convert a detected variable to our supported format
 */
export function convertToSupportedFormat(variable: DetectedVariable): string {
  // Normalize name: lowercase, replace spaces with underscores
  const normalizedName = variable.name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  // Include default value if present
  if (variable.defaultValue) {
    return `\${${normalizedName}:${variable.defaultValue}}`;
  }

  return `\${${normalizedName}}`;
}

/**
 * Convert all detected variables in text to our supported format
 */
export function convertAllVariables(text: string): string {
  const detected = detectVariables(text);

  if (detected.length === 0) return text;

  // `detected` is already sorted by startIndex ascending.
  // Reconstruct the string in a single linear sweep to avoid repeated sorting and slice allocations.
  let result = "";
  let lastIndex = 0;

  for (const variable of detected) {
    result += text.slice(lastIndex, variable.startIndex) + convertToSupportedFormat(variable);
    lastIndex = variable.endIndex;
  }

  result += text.slice(lastIndex);

  return result;
}

/**
 * Get a human-readable pattern description
 */
export function getPatternDescription(pattern: VariablePattern): string {
  switch (pattern) {
    case "double_bracket":
      return "[[...]]";
    case "double_curly":
      return "{{...}}";
    case "single_bracket":
      return "[...]";
    case "single_curly":
      return "{...}";
    case "angle_bracket":
      return "<...>";
    case "percent":
      return "%...%";
    case "dollar_curly":
      return "${...}";
  }
}
