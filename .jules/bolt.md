## 2025-05-15 - Optimized String Similarity for Bulk Comparison
**Learning:** Performing string normalization and tokenization inside a loop over 1000+ items is a significant bottleneck. Standard Set operations in JS like `new Set([...set1].filter(x => set2.has(x)))` create unnecessary intermediate arrays and sets, which adds pressure to the garbage collector.
**Action:** Extract similarity features (normalized strings and token Sets) once before entering loops. Use a manual loop for set intersection size calculations to achieve $O(\min(N, M))$ complexity without allocations.
