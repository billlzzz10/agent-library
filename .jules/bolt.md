## 2025-05-30 - Optimize prompt similarity detection
**Learning:** Extracting features (normalization, tokenization, n-gram generation) once for the target content before a comparison loop significantly reduces redundant CPU work. Additionally, Jaccard intersection is faster when iterating over the smaller set and using Set.has() instead of array spreads and filters.
**Action:** Always look for opportunities to hoist expensive pre-processing out of loops and use efficient Set operations for intersection/union calculations.
