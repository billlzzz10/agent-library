## 2025-05-15 - [Similarity Check Loop Optimization]
**Learning:** Pre-extracting features (normalization, word sets, trigrams) before a heavy loop significantly reduces redundant processing. End-to-end improvement for the duplicate check was measured at ~2.04x speedup. The core similarity logic itself became ~15x faster when using pre-extracted features.
**Action:** Always look for opportunities to hoist invariant computations (like normalization) out of loops, especially when performing O(N) comparisons against a dataset.
