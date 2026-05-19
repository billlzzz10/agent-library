/**
 * Content similarity utilities for duplicate detection
 */

/**
 * Interface representing pre-calculated features for a piece of content
 * to optimize bulk similarity comparisons.
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
 * Calculate n-grams (sequence of n characters) for a string.
 */
function getNgrams(str: string, n: number = 3): Set<string> {
  const ngrams = new Set<string>();
  const padded = " ".repeat(n - 1) + str + " ".repeat(n - 1);
  for (let i = 0; i <= padded.length - n; i++) {
    ngrams.add(padded.slice(i, i + n));
  }
  return ngrams;
}

/**
 * Extract similarity features from content for efficient bulk comparison.
 */
export function extractFeatures(content: string): SimilarityFeatures {
  const normalized = normalizeContent(content);
  return {
    normalized,
    wordSet: new Set(normalized.split(" ").filter(Boolean)),
    ngramSet: getNgrams(normalized),
  };
}

/**
 * Calculate Jaccard similarity between two strings
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function jaccardSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.split(" ").filter(Boolean));
  const set2 = new Set(str2.split(" ").filter(Boolean));
  
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Calculate n-gram similarity for better sequence matching
 * Uses trigrams (3-character sequences) by default
 */
function ngramSimilarity(str1: string, str2: string, n: number = 3): number {
  const ngrams1 = getNgrams(str1, n);
  const ngrams2 = getNgrams(str2, n);
  
  if (ngrams1.size === 0 && ngrams2.size === 0) return 1;
  if (ngrams1.size === 0 || ngrams2.size === 0) return 0;
  
  const intersection = new Set([...ngrams1].filter(x => ngrams2.has(x)));
  const union = new Set([...ngrams1, ...ngrams2]);
  
  return intersection.size / union.size;
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
 * Efficiently check if two sets of features are similar.
 * Optimized for bulk comparison by avoiding re-normalization and re-tokenization.
 */
export function isSimilarContentWithFeatures(
  f1: SimilarityFeatures,
  f2: SimilarityFeatures,
  threshold: number = 0.85
): boolean {
  // Exact match after normalization
  if (f1.normalized === f2.normalized) return true;

  // Empty content edge case
  if (!f1.normalized || !f2.normalized) return false;

  // Jaccard similarity (word-level)
  let intersectionSize = 0;
  // Iterate over smaller set for intersection calculation
  const [smaller, larger] = f1.wordSet.size < f2.wordSet.size
    ? [f1.wordSet, f2.wordSet]
    : [f2.wordSet, f1.wordSet];

  for (const word of smaller) {
    if (larger.has(word)) intersectionSize++;
  }
  const unionSize = f1.wordSet.size + f2.wordSet.size - intersectionSize;
  const jaccard = unionSize === 0 ? 0 : intersectionSize / unionSize;

  // N-gram similarity (character-level)
  let ngramIntersectionSize = 0;
  const [smallerNgram, largerNgram] = f1.ngramSet.size < f2.ngramSet.size
    ? [f1.ngramSet, f2.ngramSet]
    : [f2.ngramSet, f1.ngramSet];

  for (const ngram of smallerNgram) {
    if (largerNgram.has(ngram)) ngramIntersectionSize++;
  }
  const ngramUnionSize = f1.ngramSet.size + f2.ngramSet.size - ngramIntersectionSize;
  const ngramScore = ngramUnionSize === 0 ? 0 : ngramIntersectionSize / ngramUnionSize;

  // Weighted average: 60% Jaccard, 40% n-gram
  return (jaccard * 0.6 + ngramScore * 0.4) >= threshold;
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
