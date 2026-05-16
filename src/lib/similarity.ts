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
 * Calculate Jaccard similarity between two strings
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function jaccardSimilarity(str1: string, str2: string): number {
  const s1 = new Set(str1.split(" ").filter(Boolean));
  const s2 = new Set(str2.split(" ").filter(Boolean));
  
  if (s1.size === 0 && s2.size === 0) return 1;
  if (s1.size === 0 || s2.size === 0) return 0;
  
  // More efficient intersection count without creating extra sets or arrays
  let intersect = 0;
  for (const item of s1) {
    if (s2.has(item)) {
      intersect++;
    }
  }
  
  // Jaccard index: |A ∩ B| / |A ∪ B|
  // |A ∪ B| = |A| + |B| - |A ∩ B|
  return intersect / (s1.size + s2.size - intersect);
}

/**
 * Calculate n-gram similarity for better sequence matching
 * Uses trigrams (3-character sequences) by default
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
  
  let intersect = 0;
  for (const item of ngrams1) {
    if (ngrams2.has(item)) {
      intersect++;
    }
  }
  
  return intersect / (ngrams1.size + ngrams2.size - intersect);
}

/**
 * Combined similarity score using multiple algorithms
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarity(content1: string, content2: string): number {
  const normalized1 = normalizeContent(content1);
  const normalized2 = normalizeContent(content2);
  
  return calculateSimilarityNormalized(normalized1, normalized2);
}

/**
 * Combined similarity score using multiple algorithms on ALREADY NORMALIZED content
 * Returns a value between 0 (completely different) and 1 (identical)
 * Performance optimization for bulk comparisons
 */
export function calculateSimilarityNormalized(normalized1: string, normalized2: string): number {
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
 * Check if two ALREADY NORMALIZED contents are similar enough to be considered duplicates
 * Performance optimization for bulk comparisons
 */
export function isSimilarContentNormalized(
  normalized1: string,
  normalized2: string,
  threshold: number = 0.85
): boolean {
  return calculateSimilarityNormalized(normalized1, normalized2) >= threshold;
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
