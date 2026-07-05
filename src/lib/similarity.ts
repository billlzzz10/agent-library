/**
 * Content similarity utilities for duplicate detection
 */

export const DEFAULT_SIMILARITY_THRESHOLD = 0.85;

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
  const words = new Set(normalized.split(" ").filter(Boolean));
  
  const trigrams = new Set<string>();
  if (normalized.length > 0) {
    const n = 3;
    const padded = " ".repeat(n - 1) + normalized + " ".repeat(n - 1);
    for (let i = 0; i <= padded.length - n; i++) {
      trigrams.add(padded.slice(i, i + n));
    }
  }
  
  return { normalized, words, trigrams };
}

/**
 * Efficiently calculate the size of intersection between two sets
 */
function intersectionSize(set1: Set<string>, set2: Set<string>): number {
  let count = 0;
  if (set1.size < set2.size) {
    for (const item of set1) {
      if (set2.has(item)) count++;
    }
  } else {
    for (const item of set2) {
      if (set1.has(item)) count++;
    }
  }
  return count;
}

/**
 * Calculate Jaccard similarity between two sets of words
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function jaccardSimilarityFromSets(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;
  
  const intersectSize = intersectionSize(set1, set2);
  const unionSize = set1.size + set2.size - intersectSize;
  
  return intersectSize / unionSize;
}

/**
 * Calculate n-gram similarity from pre-calculated trigram sets
 */
function ngramSimilarityFromSets(ngrams1: Set<string>, ngrams2: Set<string>): number {
  if (ngrams1.size === 0 && ngrams2.size === 0) return 1;
  if (ngrams1.size === 0 || ngrams2.size === 0) return 0;
  
  const intersectSize = intersectionSize(ngrams1, ngrams2);
  const unionSize = ngrams1.size + ngrams2.size - intersectSize;
  
  return intersectSize / unionSize;
}

/**
 * Calculate similarity between two pre-extracted feature sets
 */
export function calculateSimilarityWithFeatures(
  feat1: SimilarityFeatures,
  feat2: SimilarityFeatures
): number {
  // Exact match after normalization
  if (feat1.normalized === feat2.normalized) return 1;
  
  // Empty content edge case
  if (!feat1.normalized || !feat2.normalized) return 0;
  
  const jaccard = jaccardSimilarityFromSets(feat1.words, feat2.words);
  const ngram = ngramSimilarityFromSets(feat1.trigrams, feat2.trigrams);
  
  // Weighted average: 60% Jaccard (word overlap), 40% n-gram (sequence similarity)
  return jaccard * 0.6 + ngram * 0.4;
}

/**
 * Combined similarity score using multiple algorithms
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarity(content1: string, content2: string): number {
  // Check for identity first
  if (content1 === content2) return 1;

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
