## 2025-05-15 - Optimizing Bulk Similarity Checks

**Learning:** Duplicate detection loops that normalize and tokenize content on every iteration are a major CPU bottleneck. For 1000 comparisons, we were doing 2001 normalizations and 2001 tokenizations (1 for new, 1000 for existing).

**Action:** Extract "features" (normalized content and Sets) once and reuse them. Also, use Set iteration for intersections to reach O(min(N, M)) complexity instead of O(N+M) with intermediate allocations.
