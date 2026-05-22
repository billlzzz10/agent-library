/**
 * Content similarity utilities for duplicate detection
 */

/**
 * Similarity features extracted from content for efficient comparison
 */
export interface SimilarityFeatures {
  normalized: string;
  wordSet: Set<string>;
  ngramSet: Set<string>;
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
 * Extract features from content for efficient bulk similarity checking
 */
export function extractFeatures(content: string): SimilarityFeatures {
  const normalized = normalizeContent(content);

  // Extract word set
  const wordSet = new Set(normalized.split(" ").filter(Boolean));

  // Extract n-gram set (trigrams)
  const n = 3;
  const ngramSet = new Set<string>();
  if (normalized) {
    const padded = " ".repeat(n - 1) + normalized + " ".repeat(n - 1);
    for (let i = 0; i <= padded.length - n; i++) {
      ngramSet.add(padded.slice(i, i + n));
    }
  }
  
  return { normalized, wordSet, ngramSet };
}

/**
 * Calculate Jaccard similarity between two sets efficiently
 */
function calculateJaccard(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;
  
  let intersectionSize = 0;
  // Always iterate over the smaller set for performance
  const [smaller, larger] = set1.size <= set2.size ? [set1, set2] : [set2, set1];
  
  for (const item of smaller) {
    if (larger.has(item)) {
      intersectionSize++;
    }
  }

  const unionSize = set1.size + set2.size - intersectionSize;
  return intersectionSize / unionSize;
}

/**
 * Calculate Jaccard similarity between two strings
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function jaccardSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.split(" ").filter(Boolean));
  const set2 = new Set(str2.split(" ").filter(Boolean));
  return calculateJaccard(set1, set2);
}

/**
 * Calculate n-gram similarity for better sequence matching
 * Uses trigrams (3-character sequences) by default
 */
function ngramSimilarity(str1: string, str2: string, n: number = 3): number {
  const getNgrams = (str: string): Set<string> => {
    const ngrams = new Set<string>();
    if (!str) return ngrams;
    const padded = " ".repeat(n - 1) + str + " ".repeat(n - 1);
    for (let i = 0; i <= padded.length - n; i++) {
      ngrams.add(padded.slice(i, i + n));
    }
    return ngrams;
  };
  
  const ngrams1 = getNgrams(str1);
  const ngrams2 = getNgrams(str2);
  return calculateJaccard(ngrams1, ngrams2);
}

/**
 * Combined similarity score using multiple algorithms
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarity(content1: string, content2: string): number {
  const normalized1 = normalizeContent(content1);
  const normalized2 = normalizeContent(content2);
  
  // Exact match after normalization
  if (normalized1 === normalized2) return 1;
  
  // Empty content edge case
  if (!normalized1 || !normalized2) return 0;
  
  // Combine Jaccard (word-level) and n-gram (character-level) similarities
  const jaccard = jaccardSimilarity(normalized1, normalized2);
  const ngram = ngramSimilarity(normalized1, normalized2);
  
  // Weighted average: 60% Jaccard (word overlap), 40% n-gram (sequence similarity)
  return jaccard * 0.6 + ngram * 0.4;
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
 * Calculate similarity using pre-extracted features
 * This is much faster for bulk comparisons
 */
export function calculateSimilarityWithFeatures(
  f1: SimilarityFeatures,
  f2: SimilarityFeatures
): number {
  // Exact match check
  if (f1.normalized === f2.normalized) return 1;

  // Empty content edge case
  if (!f1.normalized || !f2.normalized) return 0;

  const jaccard = calculateJaccard(f1.wordSet, f2.wordSet);
  const ngram = calculateJaccard(f1.ngramSet, f2.ngramSet);

  return jaccard * 0.6 + ngram * 0.4;
}

/**
 * Check if two contents are similar using pre-extracted features
 */
export function isSimilarContentWithFeatures(
  f1: SimilarityFeatures,
  f2: SimilarityFeatures,
  threshold: number = 0.85
): boolean {
  return calculateSimilarityWithFeatures(f1, f2) >= threshold;
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
