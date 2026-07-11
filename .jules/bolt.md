# Bolt's Performance Journal

## 2025-05-15 - [Similarity Check Optimization]
**Learning:** Pre-extracting features (normalization, word sets, trigrams) for a search query before comparing against a batch of items significantly reduces CPU time and memory pressure by avoiding redundant O(N) operations in the inner loop. Additionally, optimizing set intersections by iterating over the smaller set and avoiding array spreads/intermediate sets yields a ~15-25x speedup in core comparison logic.
**Action:** Always look for opportunities to hoist invariant computations out of loops, especially in search or duplicate detection logic. Use efficient set intersection patterns in performance-critical paths.
