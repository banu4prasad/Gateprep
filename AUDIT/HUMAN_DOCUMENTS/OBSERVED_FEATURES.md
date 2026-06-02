# Observed Features

*   **Email OTP Authentication**: Code shows endpoints in `auth.py` for registration and login via OTP, with `SMTP` credentials.
    *   **Evidence**: Inspection of `backend/app/models/models.py` reveals the `OTPToken` model.
*   **Admin Panel**: User, test, and series management observed in `admin.py`.
*   **Test Interface**: Code for tests, MCQ/MSQ/NAT questions, and timer observed in models and API endpoints.
*   **Syllabus Checklist**: `checklist.py` handles progress tracking.
*   **Bookmarks**: Endpoints in `bookmarks.py` for saving questions with notes.

**Backend Health Check**:
The backend server runs successfully and responds to the health check endpoint.
**Evidence**:

```
INFO:     127.0.0.1:39576 - "GET /health HTTP/1.1" 200 OK
{"status":"ok","version":"2.0.0"} INFO:     Started server process [13680]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```


*Confidence: [MEDIUM] - Features observed in source code and database models, backend runs successfully in a local mocked SQLite test, but full frontend e2e was blocked by Docker issue.*
