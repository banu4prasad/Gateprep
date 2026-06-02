# Architecture

The system consists of:
1. **Frontend**: React application bundled by Vite. Served via Nginx in Docker or directly via a static host (like Vercel).
2. **Backend**: FastAPI application serving a REST API. Handles business logic, authentication (OTP), and external integrations.
3. **Database**: PostgreSQL database.

**Evidence**:
Inspecting `docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:16-alpine
  backend:
    build: ./backend
  frontend:
    build: ./frontend
```
