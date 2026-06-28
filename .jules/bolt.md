# Bolt Journal

## 2025-05-14 - Optimized Similarity Batch Comparison
**Learning:** Pre-extracting features (normalization, word sets, and trigrams) before batch comparisons yields a performance improvement of ~6x-8x in the comparison loop. Redundant `normalizeContent` calls and Set creations inside the `find` loop were the primary bottleneck.
**Action:** When performing $O(N)$ comparisons against a single target, always extract the target's features once outside the loop. Use feature-based comparison functions to avoid redundant processing of the target content.
