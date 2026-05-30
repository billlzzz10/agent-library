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
 * Calculate Jaccard similarity between two sets
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;
  
  // Optimization: iterate over the smaller set
  const [smaller, larger] = set1.size < set2.size ? [set1, set2] : [set2, set1];
  let intersectionSize = 0;
  for (const item of smaller) {
    if (larger.has(item)) {
      intersectionSize++;
    }
  }

  // Union size = size1 + size2 - intersection
  const unionSize = set1.size + set2.size - intersectionSize;
  
  return intersectionSize / unionSize;
}

/**
 * Get n-grams for a string
 * Uses trigrams (3-character sequences) by default
 */
function getNgrams(str: string, n: number = 3): Set<string> {
  const ngrams = new Set<string>();
  if (str.length === 0) return ngrams;
  
  const padded = " ".repeat(n - 1) + str + " ".repeat(n - 1);
  for (let i = 0; i <= padded.length - n; i++) {
    ngrams.add(padded.slice(i, i + n));
  }
  return ngrams;
}

/**
 * Calculate n-gram similarity for better sequence matching
 */
function ngramSimilarity(ngrams1: Set<string>, ngrams2: Set<string>): number {
  if (ngrams1.size === 0 && ngrams2.size === 0) return 1;
  if (ngrams1.size === 0 || ngrams2.size === 0) return 0;
  
  // Optimization: iterate over the smaller set
  const [smaller, larger] = ngrams1.size < ngrams2.size ? [ngrams1, ngrams2] : [ngrams2, ngrams1];
  let intersectionSize = 0;
  for (const item of smaller) {
    if (larger.has(item)) {
      intersectionSize++;
    }
  }

  const unionSize = ngrams1.size + ngrams2.size - intersectionSize;
  
  return intersectionSize / unionSize;
}

/**
 * Features used for similarity calculation
 */
export interface SimilarityFeatures {
  normalized: string;
  words: Set<string>;
  ngrams: Set<string>;
}

/**
 * Extract features from content for efficient similarity comparison
 */
export function extractFeatures(content: string): SimilarityFeatures {
  const normalized = normalizeContent(content);
  return {
    normalized,
    words: new Set(normalized.split(" ").filter(Boolean)),
    ngrams: getNgrams(normalized),
  };
}

/**
 * Calculate similarity between two pre-extracted feature sets
 */
export function calculateSimilarityWithFeatures(
  features1: SimilarityFeatures,
  features2: SimilarityFeatures
): number {
  // Exact match after normalization
  if (features1.normalized === features2.normalized) return 1;
  
  // Empty content edge case
  if (!features1.normalized || !features2.normalized) return 0;
  
  // Combine Jaccard (word-level) and n-gram (character-level) similarities
  const jaccard = jaccardSimilarity(features1.words, features2.words);
  const ngram = ngramSimilarity(features1.ngrams, features2.ngrams);
  
  // Weighted average: 60% Jaccard (word overlap), 40% n-gram (sequence similarity)
  return jaccard * 0.6 + ngram * 0.4;
}

/**
 * Combined similarity score using multiple algorithms
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarity(content1: string, content2: string): number {
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
 * Check if two feature sets are similar enough to be considered duplicates
 */
export function isSimilarContentWithFeatures(
  features1: SimilarityFeatures,
  features2: SimilarityFeatures,
  threshold: number = 0.85
): boolean {
  return calculateSimilarityWithFeatures(features1, features2) >= threshold;
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
