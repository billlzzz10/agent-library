/**
 * Content similarity utilities for duplicate detection
 */

export interface SimilarityFeatures {
  normalized: string;
  words: Set<string>;
  ngrams: Set<string>;
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
  const ngrams = getNgrams(normalized);
  
  return {
    normalized,
    words,
    ngrams,
  };
}

/**
 * Calculate Jaccard similarity between two sets efficiently
 */
function calculateSetSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;
  
  let intersectionSize = 0;
  // Iterate over the smaller set for efficiency
  if (set1.size < set2.size) {
    for (const x of set1) {
      if (set2.has(x)) intersectionSize++;
    }
  } else {
    for (const x of set2) {
      if (set1.has(x)) intersectionSize++;
    }
  }
  
  const unionSize = set1.size + set2.size - intersectionSize;
  return intersectionSize / unionSize;
}

/**
 * Calculate n-grams for better sequence matching
 * Uses trigrams (3-character sequences) by default
 */
function getNgrams(str: string, n: number = 3): Set<string> {
  const ngrams = new Set<string>();
  if (!str) return ngrams;
  
  const padded = " ".repeat(n - 1) + str + " ".repeat(n - 1);
  for (let i = 0; i <= padded.length - n; i++) {
    ngrams.add(padded.slice(i, i + n));
  }
  return ngrams;
}

/**
 * Calculate similarity between two pre-extracted feature sets
 */
export function calculateSimilarityWithFeatures(
  f1: SimilarityFeatures,
  f2: SimilarityFeatures
): number {
  // Exact match after normalization
  if (f1.normalized === f2.normalized) return 1;
  
  // Empty content edge case
  if (!f1.normalized || !f2.normalized) return 0;
  
  const jaccard = calculateSetSimilarity(f1.words, f2.words);
  const ngram = calculateSetSimilarity(f1.ngrams, f2.ngrams);
  
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
