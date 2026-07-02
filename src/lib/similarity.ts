/**
 * Content similarity utilities for duplicate detection
 */

/**
 * Features extracted from content for efficient similarity comparison
 */
export interface SimilarityFeatures {
  normalized: string;
  words: Set<string>;
  trigrams: Set<string>;
}

/**
 * Extract features from content for comparison
 */
export function extractFeatures(content: string): SimilarityFeatures {
  const normalized = normalizeContent(content);

  // Word set for Jaccard similarity
  const words = new Set(normalized.split(" ").filter(Boolean));

  // Trigram set for sequence similarity
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
 * Calculate the size of the intersection of two sets efficiently
 */
function intersectionSize<T>(set1: Set<T>, set2: Set<T>): number {
  const smaller = set1.size < set2.size ? set1 : set2;
  const larger = set1.size < set2.size ? set2 : set1;
  let count = 0;
  for (const item of smaller) {
    if (larger.has(item)) {
      count++;
    }
  }
  return count;
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

  // Jaccard similarity (word-level)
  const jaccardIntersection = intersectionSize(f1.words, f2.words);
  const jaccardUnion = f1.words.size + f2.words.size - jaccardIntersection;
  const jaccard = jaccardUnion === 0 ? 0 : jaccardIntersection / jaccardUnion;

  // Trigram similarity (character-level sequence)
  const ngramIntersection = intersectionSize(f1.trigrams, f2.trigrams);
  const ngramUnion = f1.trigrams.size + f2.trigrams.size - ngramIntersection;
  const ngram = ngramUnion === 0 ? 0 : ngramIntersection / ngramUnion;

  // Weighted average: 60% Jaccard (word overlap), 40% n-gram (sequence similarity)
  return jaccard * 0.6 + ngram * 0.4;
}

/**
 * Calculate Jaccard similarity between two strings
 * Returns a value between 0 (completely different) and 1 (identical)
 * @deprecated Use calculateSimilarityWithFeatures for better performance
 */
function jaccardSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.split(" ").filter(Boolean));
  const set2 = new Set(str2.split(" ").filter(Boolean));

  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;

  const intersection = intersectionSize(set1, set2);
  const union = set1.size + set2.size - intersection;

  return intersection / union;
}

/**
 * Calculate n-gram similarity for better sequence matching
 * Uses trigrams (3-character sequences) by default
 * @deprecated Use calculateSimilarityWithFeatures for better performance
 */
function ngramSimilarity(str1: string, str2: string, n: number = 3): number {
  const getNgrams = (str: string): Set<string> => {
    const ngrams = new Set<string>();
    const padded = " ".repeat(n - 1) + str + " ".repeat(n - 1);
    for (let i = 0; i <= padded.length - n; i++) {
      ngrams.add(padded.slice(i, i + n));
    }
    return ngrams;
  };

  const ngrams1 = getNgrams(str1);
  const ngrams2 = getNgrams(str2);

  if (ngrams1.size === 0 && ngrams2.size === 0) return 1;
  if (ngrams1.size === 0 || ngrams2.size === 0) return 0;

  const intersection = intersectionSize(ngrams1, ngrams2);
  const union = ngrams1.size + ngrams2.size - intersection;

  return intersection / union;
}

/**
 * Combined similarity score using multiple algorithms
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarity(content1: string, content2: string): number {
  // Use pre-extracted features for consistent logic
  const features1 = extractFeatures(content1);
  const features2 = extractFeatures(content2);

  return calculateSimilarityWithFeatures(features1, features2);
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
