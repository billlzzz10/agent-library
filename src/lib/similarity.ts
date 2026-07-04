/**
 * Content similarity utilities for duplicate detection
 */

export interface SimilarityFeatures {
  normalized: string;
  words: Set<string>;
  trigrams: Set<string>;
}

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
 * Extract features from content for efficient similarity comparison
 */
export function extractFeatures(content: string): SimilarityFeatures {
  const normalized = normalizeContent(content);
  
  // Word set for Jaccard
  const words = new Set(normalized.split(" ").filter(Boolean));
  
  // Trigram set for character sequence matching
  const trigrams = new Set<string>();
  if (normalized) {
    const n = 3;
    const padded = " ".repeat(n - 1) + normalized + " ".repeat(n - 1);
    for (let i = 0; i <= padded.length - n; i++) {
      trigrams.add(padded.slice(i, i + n));
    }
  }
  
  return { normalized, words, trigrams };
}

/**
 * Calculate intersection size of two sets efficiently
 */
function intersectionSize(set1: Set<string>, set2: Set<string>): number {
  let count = 0;
  const [smaller, larger] = set1.size < set2.size ? [set1, set2] : [set2, set1];
  for (const item of smaller) {
    if (larger.has(item)) {
      count++;
    }
  }
  return count;
}

/**
 * Calculate similarity using pre-extracted features
 */
export function calculateSimilarityWithFeatures(
  feat1: SimilarityFeatures,
  feat2: SimilarityFeatures
): number {
  // Exact match after normalization
  if (feat1.normalized === feat2.normalized) return 1;
  
  // Empty content edge case
  if (!feat1.normalized || !feat2.normalized) return 0;
  
  // Jaccard similarity (word-level)
  const wordIntersect = intersectionSize(feat1.words, feat2.words);
  const wordUnion = feat1.words.size + feat2.words.size - wordIntersect;
  const jaccard = wordUnion === 0 ? 0 : wordIntersect / wordUnion;

  // N-gram similarity (character-level trigrams)
  const trigramIntersect = intersectionSize(feat1.trigrams, feat2.trigrams);
  const trigramUnion = feat1.trigrams.size + feat2.trigrams.size - trigramIntersect;
  const ngram = trigramUnion === 0 ? 0 : trigramIntersect / trigramUnion;
  
  // Weighted average: 60% Jaccard (word overlap), 40% n-gram (sequence similarity)
  return jaccard * 0.6 + ngram * 0.4;
}

/**
 * Combined similarity score using multiple algorithms
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarity(content1: string, content2: string): number {
  const feat1 = extractFeatures(content1);
  const feat2 = extractFeatures(content2);
  return calculateSimilarityWithFeatures(feat1, feat2);
}

/**
 * Check if two contents are similar enough to be considered duplicates
 * Default threshold is 0.85 (85% similar)
 */
export function isSimilarContent(
  content1: string, 
  content2: string, 
  threshold: number = 0.85
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
