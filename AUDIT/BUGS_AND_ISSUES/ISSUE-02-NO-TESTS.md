# Missing Test Suite
**Issue:** The project lacks any automated tests.
**Suggested Fix:** Initialize a `pytest` suite for the backend and a `vitest` suite for the frontend.

**Evidence**:

```
find backend frontend -name "test*.py" -o -name "*.test.js" -o -name "*.spec.js"
(No output generated, confirming absence of test files)
```
