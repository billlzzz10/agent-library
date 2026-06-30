## 2025-05-15 - Redundant normalization in similarity checks
**Learning:** Performing regex-heavy normalization and set creations inside an O(N) loop (where N is the number of existing records) is a major CPU bottleneck. Pre-extracting features for the search term reduces the number of operations from 2N to N+1.
**Action:** Always extract features (Sets, normalized strings) once outside of comparison loops.

## 2025-05-15 - Efficient Set intersection
**Learning:** Using `new Set([...set1].filter(x => set2.has(x)))` creates a new array and a new set in every iteration. A simple `for...of` loop with a counter is much faster and avoids memory pressure.
**Action:** Use a manual counter loop for calculating intersection sizes of Sets.
