## 2025-05-14 - Optimized Bulk Similarity Detection
**Learning:** In bulk similarity checks (e.g., 1000 items), redundant processing of the target content (normalization, tokenization) is a significant bottleneck. Standard Set operations like `[...set1].filter(x => set2.has(x))` create intermediate arrays and sets, which increases GC pressure.
**Action:** Use a "Features" extraction pattern to pre-process target content once. Optimize Set intersection logic by iterating over the smaller set and avoiding intermediate data structures. This yielded a ~2.5x speedup in total comparison time.
