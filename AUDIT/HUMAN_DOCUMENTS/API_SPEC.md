# API Specification

The API is fully documented via OpenAPI (Swagger UI) at `/docs` when the backend is running.

**Key Endpoints (derived from routing structure):**
- `auth`: `/auth/register`, `/auth/verify-register`
- `tests`: `/tests/`, `/tests/{test_id}/start`
- `admin`: `/admin/tests`
- `bookmarks`: `/bookmarks/`
- `checklist`: `/checklist/`

**Evidence (`backend/app/main.py`)**:
```python
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(tests.router)
app.include_router(bookmarks.router)
app.include_router(checklist.router)
```
