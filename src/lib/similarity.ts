/**
 * Content similarity utilities for duplicate detection
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
 * Get intersection size between two sets efficiently.
 * Loops through the smaller set and checks presence in the larger set, avoiding allocation.
 */
function getIntersectionSize(set1: Set<string>, set2: Set<string>): number {
  const [smaller, larger] = set1.size < set2.size ? [set1, set2] : [set2, set1];
  let count = 0;
  for (const item of smaller) {
    if (larger.has(item)) {
      count++;
    }
  }
  return count;
}

/**
 * Get word set for a normalized string
 */
export function getWordSet(normalized: string): Set<string> {
  return new Set(normalized.split(" ").filter(Boolean));
}

/**
 * Get n-gram set for a normalized string
 */
export function getNgramSet(normalized: string, n: number = 3): Set<string> {
  const ngrams = new Set<string>();
  if (!normalized) return ngrams;
  const padded = " ".repeat(n - 1) + normalized + " ".repeat(n - 1);
  for (let i = 0; i <= padded.length - n; i++) {
    ngrams.add(padded.slice(i, i + n));
  }
  return ngrams;
}

/**
 * Extract similarity features from raw content
 */
export function extractFeatures(content: string): SimilarityFeatures {
  const normalized = normalizeContent(content);
  return {
    normalized,
    wordSet: getWordSet(normalized),
    ngramSet: getNgramSet(normalized),
  };
}

/**
 * Calculate similarity between pre-extracted features
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

  // Jaccard similarity
  let jaccard = 0;
  if (f1.wordSet.size === 0 && f2.wordSet.size === 0) {
    jaccard = 1;
  } else if (f1.wordSet.size > 0 && f2.wordSet.size > 0) {
    const intersectionSize = getIntersectionSize(f1.wordSet, f2.wordSet);
    const unionSize = f1.wordSet.size + f2.wordSet.size - intersectionSize;
    jaccard = intersectionSize / unionSize;
  }

  // N-gram similarity
  let ngram = 0;
  if (f1.ngramSet.size === 0 && f2.ngramSet.size === 0) {
    ngram = 1;
  } else if (f1.ngramSet.size > 0 && f2.ngramSet.size > 0) {
    const intersectionSize = getIntersectionSize(f1.ngramSet, f2.ngramSet);
    const unionSize = f1.ngramSet.size + f2.ngramSet.size - intersectionSize;
    ngram = intersectionSize / unionSize;
  }

  // Weighted average: 60% Jaccard (word overlap), 40% n-gram (sequence similarity)
  return jaccard * 0.6 + ngram * 0.4;
}

/**
 * Check if pre-extracted features are similar enough to be considered duplicates
 * Default threshold is 0.85 (85% similar)
 */
export function isSimilarContentWithFeatures(
  f1: SimilarityFeatures,
  f2: SimilarityFeatures,
  threshold: number = 0.85
): boolean {
  return calculateSimilarityWithFeatures(f1, f2) >= threshold;
}

/**
 * Calculate Jaccard similarity between two strings
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function jaccardSimilarity(str1: string, str2: string): number {
  const set1 = getWordSet(str1);
  const set2 = getWordSet(str2);

  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;

  const intersectionSize = getIntersectionSize(set1, set2);
  const unionSize = set1.size + set2.size - intersectionSize;

  return intersectionSize / unionSize;
}

/**
 * Calculate n-gram similarity for better sequence matching
 * Uses trigrams (3-character sequences) by default
 */
function ngramSimilarity(str1: string, str2: string, n: number = 3): number {
  const ngrams1 = getNgramSet(str1, n);
  const ngrams2 = getNgramSet(str2, n);

  if (ngrams1.size === 0 && ngrams2.size === 0) return 1;
  if (ngrams1.size === 0 || ngrams2.size === 0) return 0;

  const intersectionSize = getIntersectionSize(ngrams1, ngrams2);
  const unionSize = ngrams1.size + ngrams2.size - intersectionSize;

  return intersectionSize / unionSize;
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
