## 2025-05-15 - Redundant normalization and set operations in similarity detection
**Learning:** The similarity detection logic in `src/lib/similarity.ts` was performing redundant `normalizeContent` calls and inefficient set operations (creating intermediate arrays and sets for intersection/union) during batch comparisons in the prompt creation API.
**Action:** Use a "feature extraction" pattern to normalize and tokenize content once before entering comparison loops, and implement a `calculateSetSimilarity` utility that avoids object allocation for intersection/union calculations.
