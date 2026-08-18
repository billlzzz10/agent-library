/**
 * Content similarity utilities for duplicate detection
 */

/**
 * Pre-extracted similarity features to avoid redundant text normalization,
 * word tokenization, and n-gram extraction in batch comparison loops.
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
  return (
    content
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
      .trim()
  );
}

/**
 * Helper to compute word Set from normalized text without array allocations where possible
 */
function getWordsSet(normalized: string): Set<string> {
  const words = normalized.split(" ");
  const set = new Set<string>();
  for (let i = 0; i < words.length; i++) {
    if (words[i]) {
      set.add(words[i]);
    }
  }
  return set;
}

/**
 * Helper to compute character n-gram Set from normalized text
 */
function getNgramsSet(normalized: string, n: number = 3): Set<string> {
  const ngrams = new Set<string>();
  if (!normalized) return ngrams;
  const padded = " ".repeat(n - 1) + normalized + " ".repeat(n - 1);
  const len = padded.length - n;
  for (let i = 0; i <= len; i++) {
    ngrams.add(padded.slice(i, i + n));
  }
  return ngrams;
}

/**
 * Fast intersection count between two Sets by iterating over the smaller Set.
 * Avoids array spreading (`[...set1]`) and intermediate Set allocations.
 */
function getIntersectionSize(set1: Set<string>, set2: Set<string>): number {
  const [small, large] = set1.size < set2.size ? [set1, set2] : [set2, set1];
  let count = 0;
  for (const item of small) {
    if (large.has(item)) {
      count++;
    }
  }
  return count;
}

/**
 * Extract pre-computed similarity features (normalized string, word Set, trigram Set).
 * Pre-computing features once per text significantly speeds up batch similarity checks (O(N) vs O(N*M)).
 */
export function extractFeatures(content: string): SimilarityFeatures {
  const normalized = normalizeContent(content);
  return {
    normalized,
    words: getWordsSet(normalized),
    trigrams: getNgramsSet(normalized, 3),
  };
}

/**
 * Calculate Jaccard similarity between two Sets.
 * Uses mathematical identity |A ∪ B| = |A| + |B| - |A ∩ B| to avoid allocating union Sets.
 */
function jaccardSimilarityFromSets(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;

  const intersectionSize = getIntersectionSize(set1, set2);
  const unionSize = set1.size + set2.size - intersectionSize;

  return intersectionSize / unionSize;
}

/**
 * Calculate similarity score using pre-extracted features.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
export function calculateSimilarityWithFeatures(
  feat1: SimilarityFeatures,
  feat2: SimilarityFeatures
): number {
  // Exact match after normalization
  if (feat1.normalized === feat2.normalized) return 1;

  // Empty content edge case
  if (!feat1.normalized || !feat2.normalized) return 0;

  // Combine Jaccard (word-level) and n-gram (character-level) similarities
  const jaccard = jaccardSimilarityFromSets(feat1.words, feat2.words);
  const ngram = jaccardSimilarityFromSets(feat1.trigrams, feat2.trigrams);

  // Weighted average: 60% Jaccard (word overlap), 40% n-gram (sequence similarity)
  return jaccard * 0.6 + ngram * 0.4;
}

/**
 * Check if two pre-extracted feature sets are similar enough to be considered duplicates.
 */
export function isSimilarContentWithFeatures(
  feat1: SimilarityFeatures,
  feat2: SimilarityFeatures,
  threshold: number = 0.85
): boolean {
  return calculateSimilarityWithFeatures(feat1, feat2) >= threshold;
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
