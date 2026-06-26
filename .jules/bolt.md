## 2025-05-15 - [Optimized Similarity Duplicate Check]
**Learning:** Pre-extracting features (normalization, word sets, trigrams) before batch comparisons yields a ~2.3x-2.5x speedup by eliminating redundant regex-heavy normalization and set creation inside loops.
**Action:** Always look for opportunities to hoist expensive feature extraction or normalization out of loops when performing bulk comparisons.
