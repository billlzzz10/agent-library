## 2025-05-14 - Optimized Bulk Similarity Checking
**Learning:** Pre-extracting features (normalization, word sets, trigrams) before a bulk similarity comparison loop significantly reduces redundant CPU-intensive work. Additionally, manual set intersection using a loop is much faster than array spreading and filtering.
**Action:** Always look for opportunities to hoist expensive computations out of loops, especially when performing O(N) or O(N^2) operations like similarity matching.
