# Database Schema

Defined using SQLAlchemy declarative models in `backend/app/models/models.py`:
- `User`: Stores user info, roles, and single session ID.
- `OTPToken`: Temporary table for OTP verification.
- `TestSeries`, `Test`, `Question`: Hierarchical test structure.
- `TestAttempt`, `UserAnswer`: Tracks user progress and score.
- `Bookmark`: User bookmarked questions.
- `ChecklistSubject`, `ChecklistTopic`, `ChecklistProgress`: Syllabus tracking.

**Evidence**: Inspecting `backend/app/models/models.py` confirms these classes.
