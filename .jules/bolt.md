## 2025-05-14 - Optimized Bulk Similarity Check
**Learning:** Hoisting feature extraction out of loops when comparing a single item against a large set significantly reduces redundant work. Normalization and tokenization are relatively expensive string operations that should be performed once per unique content.
**Action:** Always check if string preprocessing can be hoisted when performing bulk comparisons.
