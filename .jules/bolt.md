## 2025-05-15 - Redundant normalization in similarity loops
**Learning:** Normalizing content and extracting features (words, n-grams) is expensive. In loops that check similarity against 1000+ items, re-normalizing the *source* content 1000 times is a massive waste of CPU.
**Action:** Extract features for the source content once before starting the loop and use an optimized comparison function that accepts pre-computed features. Also, optimize Jaccard similarity to avoid intermediate array spreads and filters for intersections.
