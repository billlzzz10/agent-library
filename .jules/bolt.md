## 2025-05-15 - [Optimization] Similarity check O(N) Normalization Overhead
**Learning:** Bulk similarity comparisons (e.g. 1:1000) often re-normalize the primary string in every iteration. Additionally, Set spread operations like `[...set1]` are slower than manual loops for intersection counts.
**Action:** Always provide "Normalized" variants of comparison functions to allow pre-calculating state outside of loops. Use the inclusion-exclusion principle (|A ∪ B| = |A| + |B| - |A ∩ B|) with a single loop over the smaller set for faster Jaccard indices.
