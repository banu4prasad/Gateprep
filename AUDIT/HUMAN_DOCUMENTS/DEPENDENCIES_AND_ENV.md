# Dependencies & Environment

## Backend
- Language: Python 3.11+ (based on Dockerfile `python:3.11-slim`)
- Framework: FastAPI, Uvicorn
- Database ORM: SQLAlchemy, psycopg2
- Auth: passlib, python-jose, bcrypt

**Evidence (`backend/requirements.txt`)**:

```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
sqlalchemy>=2.0.30
psycopg2-binary>=2.9.10
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
bcrypt==4.0.1
python-multipart>=0.0.9
pdfplumber>=0.11.0
PyMuPDF>=1.24.3
python-dotenv>=1.0.1
pydantic[email]>=2.7.1
pydantic-settings>=2.2.1
cloudinary>=1.40.0
httpx>=0.27.0
email-validator>=2.1.0
```


## Frontend
- Framework: React 18 (Vite)
- Routing: react-router-dom
- Styling: Tailwind CSS

**Evidence (`frontend/package.json`)**:

```
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "axios": "^1.6.7",
    "react-hot-toast": "^2.4.1",
    "lucide-react": "^0.344.0",
    "clsx": "^2.1.0"
```


## Environment Requirements
Requires an `.env` file with `DATABASE_URL`, Cloudinary credentials, and SMTP configuration as noted in the `README.md`.
