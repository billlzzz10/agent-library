/**
 * Content similarity utilities for duplicate detection
 */

/**
 * Normalize content for comparison by:
 * - Removing variables (${...} patterns)
 * - Converting to lowercase
 * - Removing extra whitespace
 * - Removing punctuation
 */
export function normalizeContent(content: string): string {
  return content
    // Remove variables like ${variable} or ${variable:default}
    .replace(/\$\{[^}]+\}/g, "")
    // Remove common placeholder patterns like [placeholder] or <placeholder>
    .replace(/\[[^\]]+\]/g, "")
    .replace(/<[^>]+>/g, "")
    // Convert to lowercase
    .toLowerCase()
    // Remove punctuation
    .replace(/[^\w\s]/g, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Features used for similarity comparison
 */
export interface SimilarityFeatures {
  normalized: string;
  words: Set<string>;
  trigrams: Set<string>;
}

/**
 * Extract features from content for efficient comparison
 */
export function extractFeatures(content: string): SimilarityFeatures {
  const normalized = normalizeContent(content);
  const words = new Set(normalized.split(" ").filter(Boolean));

  const trigrams = new Set<string>();
  const n = 3;
  if (normalized.length > 0) {
    const padded = " ".repeat(n - 1) + normalized + " ".repeat(n - 1);
    for (let i = 0; i <= padded.length - n; i++) {
      trigrams.add(padded.slice(i, i + n));
    }
  }
  
  return { normalized, words, trigrams };
}

/**
 * Calculate similarity between two pre-extracted feature sets
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarityWithFeatures(
  f1: SimilarityFeatures,
  f2: SimilarityFeatures
): number {
  // Exact match after normalization
  if (f1.normalized === f2.normalized) return 1;
  
  // Empty content edge case
  if (!f1.normalized || !f2.normalized) return 0;
  
  // Calculate Jaccard similarity (word-level)
  let wordIntersection = 0;
  const [smallerWords, largerWords] = f1.words.size < f2.words.size
    ? [f1.words, f2.words]
    : [f2.words, f1.words];

  for (const word of smallerWords) {
    if (largerWords.has(word)) wordIntersection++;
  }

  const wordUnion = f1.words.size + f2.words.size - wordIntersection;
  const jaccard = wordUnion === 0 ? 0 : wordIntersection / wordUnion;

  // Calculate n-gram similarity (character-level)
  let trigramIntersection = 0;
  const [smallerTrigrams, largerTrigrams] = f1.trigrams.size < f2.trigrams.size
    ? [f1.trigrams, f2.trigrams]
    : [f2.trigrams, f1.trigrams];

  for (const trigram of smallerTrigrams) {
    if (largerTrigrams.has(trigram)) trigramIntersection++;
  }

  const trigramUnion = f1.trigrams.size + f2.trigrams.size - trigramIntersection;
  const ngram = trigramUnion === 0 ? 0 : trigramIntersection / trigramUnion;
  
  // Weighted average: 60% Jaccard (word overlap), 40% n-gram (sequence similarity)
  return jaccard * 0.6 + ngram * 0.4;
}

/**
 * Combined similarity score using multiple algorithms
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarity(content1: string, content2: string): number {
  const f1 = extractFeatures(content1);
  const f2 = extractFeatures(content2);
  return calculateSimilarityWithFeatures(f1, f2);
}

export const DEFAULT_SIMILARITY_THRESHOLD = 0.85;

/**
 * Check if two contents are similar enough to be considered duplicates
 * Default threshold is 0.85 (85% similar)
 */
export function isSimilarContent(
  content1: string, 
  content2: string, 
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD
): boolean {
  return calculateSimilarity(content1, content2) >= threshold;
}

/**
 * Get normalized content hash for database indexing/comparison
 * This is a simple hash for quick lookups before full similarity check
 */
export function getContentFingerprint(content: string): string {
  const normalized = normalizeContent(content);
  // Take first 500 chars of normalized content as fingerprint
  return normalized.slice(0, 500);
}
