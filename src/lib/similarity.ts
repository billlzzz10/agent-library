/**
 * Content similarity utilities for duplicate detection
 */

/**
 * Pre-computed features for similarity comparison to avoid redundant processing
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
 * Calculate Jaccard similarity between two sets
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;

  let intersectionCount = 0;
  // Iterate over the smaller set for better performance
  const [smaller, larger] = set1.size < set2.size ? [set1, set2] : [set2, set1];
  for (const item of smaller) {
    if (larger.has(item)) {
      intersectionCount++;
    }
  }

  // Jaccard = |A ∩ B| / |A ∪ B|
  // |A ∪ B| = |A| + |B| - |A ∩ B|
  const unionSize = set1.size + set2.size - intersectionCount;

  return intersectionCount / unionSize;
}

/**
 * Generate n-grams for a string
 */
export function getNgrams(str: string, n: number = 3): Set<string> {
  const ngrams = new Set<string>();
  const padded = " ".repeat(n - 1) + str + " ".repeat(n - 1);
  for (let i = 0; i <= padded.length - n; i++) {
    ngrams.add(padded.slice(i, i + n));
  }
  return ngrams;
}

/**
 * Calculate n-gram similarity for better sequence matching
 * Uses trigrams (3-character sequences) by default
 */
function ngramSimilarity(ngrams1: Set<string>, ngrams2: Set<string>): number {
  if (ngrams1.size === 0 && ngrams2.size === 0) return 1;
  if (ngrams1.size === 0 || ngrams2.size === 0) return 0;

  let intersectionCount = 0;
  const [smaller, larger] =
    ngrams1.size < ngrams2.size ? [ngrams1, ngrams2] : [ngrams2, ngrams1];
  for (const item of smaller) {
    if (larger.has(item)) {
      intersectionCount++;
    }
  }

  const unionSize = ngrams1.size + ngrams2.size - intersectionCount;

  return intersectionCount / unionSize;
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
  const set1 = new Set(normalized1.split(" ").filter(Boolean));
  const set2 = new Set(normalized2.split(" ").filter(Boolean));
  const ngrams1 = getNgrams(normalized1);
  const ngrams2 = getNgrams(normalized2);

  const jaccard = jaccardSimilarity(set1, set2);
  const ngram = ngramSimilarity(ngrams1, ngrams2);
  
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
 * Check if two contents are similar using pre-computed features
 */
export function isSimilarContentWithFeatures(
  f1: SimilarityFeatures,
  target: string | SimilarityFeatures,
  threshold: number = 0.85
): boolean {
  const f2 = typeof target === "string" ? extractFeatures(target) : target;

  // Exact match after normalization
  if (f1.normalized === f2.normalized) return true;

  // Empty content edge case
  if (!f1.normalized || !f2.normalized) return false;

  const jaccard = jaccardSimilarity(f1.words, f2.words);
  const ngram = ngramSimilarity(f1.ngrams, f2.ngrams);

  const score = jaccard * 0.6 + ngram * 0.4;
  return score >= threshold;
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

/**
 * Extract similarity features from content for efficient comparison
 */
export function extractFeatures(content: string): SimilarityFeatures {
  const normalized = normalizeContent(content);
  return {
    normalized,
    words: new Set(normalized.split(" ").filter(Boolean)),
    ngrams: getNgrams(normalized),
  };
}
