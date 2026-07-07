## 2025-05-14 - Parallelizing Server Component Data Fetching
**Learning:** Sequential awaits for independent operations (auth, config, translations, and multiple DB queries) in Next.js Server Components create a performance "waterfall". Grouping these into parallel batches using `Promise.all` can reduce server-side latency by 100-200ms on complex pages.
**Action:** Always look for independent async tasks in Page components and group them. Use a "Setup Stage" for environment/auth data and a "Data Stage" for database queries that depend on the setup.
