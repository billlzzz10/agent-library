## 2025-05-15 - Optimized Set-based Jaccard Similarity
**Learning:** Standard Jaccard similarity implementation using `new Set([...set1].filter(x => set2.has(x)))` and `new Set([...set1, ...set2])` is highly inefficient due to multiple intermediate array spreads and set allocations. A manual loop over the smaller set to count intersections followed by a mathematical union calculation (`size1 + size2 - intersection`) is significantly faster (~10x for sets of 1000 items).
**Action:** Use manual loops and avoid intermediate objects when performing set operations in performance-critical paths like similarity checks or bulk data processing.

## 2025-05-15 - Feature Pre-extraction for Batch Processing
**Learning:** When performing $O(N \cdot M)$ operations like checking one content against a batch of $M$ candidates, processing each candidate from scratch (normalization, tokenization, n-gram generation) is the primary bottleneck.
**Action:** Extract "features" (pre-calculated sets/normalized strings) once per content and pass these features to comparison functions. This reduced bulk similarity check time from ~180ms to ~2ms for 1000 checks in this codebase.
