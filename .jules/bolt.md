## 2026-06-07 - [Optimized bulk similarity comparison]
**Learning:** Performing redundant normalization and tokenization inside a comparison loop (e.g., checking similarity against 1000 items) is a significant bottleneck. Hoisting feature extraction and using efficient set intersection logic provides a measurable speedup.
**Action:** Always look for redundant computations in loops, especially when dealing with string processing or collection operations. Use pre-calculated features for bulk comparisons.
