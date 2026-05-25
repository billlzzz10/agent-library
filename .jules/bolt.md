## 2025-05-15 - Bulk Content Similarity Optimization
**Learning:** Redundant $O(N)$ string normalization and tokenization in loops is a major bottleneck. Pre-calculating "features" (token sets, trigrams) once before a comparison loop can provide up to 50x speedup for bulk operations.
**Action:** Always pre-calculate feature sets when performing $O(1 \times N)$ or $O(N \times M)$ string comparisons.
