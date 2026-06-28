## 2024-06-04 - Unnecessary KaTeX Re-Renders
**Learning:** Math formulas rendered with KaTeX inside string interpolation cause significant CPU usage when the parent component updates (like typing or selecting answers in `TestEngine.jsx`), especially if they exist in lists of options.
**Action:** Always wrap components that render heavy LaTeX via external libraries (like `react-katex`) in `React.memo` if they primarily depend on static string props, so that they skip the re-parse/re-render cycle unless the text actually changes.

## 2024-06-28 - N+1 Queries on Nested Relationships in API Routes
**Learning:** Returning Pydantic models from endpoints that iterate through SQLAlchemy query results and access nested relationships (e.g., `Bookmark.question.test`) causes severe N+1 query problems due to lazy loading.
**Action:** Always inspect the serialization loop in endpoints and proactively apply `.options(joinedload(...))` on any relationships accessed to fetch all required data efficiently in a single query.
