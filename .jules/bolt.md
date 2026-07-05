
## 2025-05-14 - Similarity Check Optimization
**Learning:** Pre-extracting features (normalized content, word Sets, and trigrams) before batch comparisons significantly reduces overhead. Redundant Set creation and string splitting are major bottlenecks in O(N) loops. Also, using manual loop for Set intersection is much faster than array spread `[...set]`.
**Action:** Always look for redundant processing in loops. Prefer passing pre-calculated objects/features when comparing one item against a collection.
