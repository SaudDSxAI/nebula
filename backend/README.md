# TRM Platform - Backend

AI-Powered Talent Relationship Management Platform - FastAPI Backend

## Technology Stack

- **Framework:** FastAPI 0.115+
- **Language:** Python 3.11+
- **Database:** PostgreSQL 14+ with SQLAlchemy (async)
- **Migrations:** Alembic
- **Authentication:** JWT (python-jose)
- **Password Hashing:** bcrypt (passlib)
- **AI Services:** OpenAI API, Pinecone (vector DB)
- **Testing:** pytest, pytest-asyncio

## Project Structure

```
backend/
├── app/
│   ├── admin/              # Super Admin routes & logic
│   ├── client/             # Client Portal routes & logic
│   ├── candidate/          # Public candidate routes
│   ├── ai/                 # AI services (OpenAI, RAG, CV parsing)
│   ├── models/             # SQLAlchemy database models
│   ├── schemas/            # Pydantic schemas (request/response)
│   ├── services/           # Business logic services
│   ├── middleware/         # Custom middleware (auth, rate limiting)
│   ├── utils/              # Utility functions
│   ├── main.py             # FastAPI app entry point
│   ├── config.py           # Configuration & settings
│   └── database.py         # Database setup & session management
├── alembic/                # Database migrations
├── tests/                  # Test files
├── requirements.txt        # Python dependencies
├── .env.example            # Example environment variables
└── README.md              # This file
```

## Setup

### Prerequisites

- Python 3.11+
- PostgreSQL 14+
- pip and virtualenv

### Installation

1. Create virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your actual configuration
```

4. Set up PostgreSQL database:
```bash
# Create database
createdb trm_platform

# Or using psql:
psql -U postgres
CREATE DATABASE trm_platform;
\q
```

5. Run database migrations:
```bash
alembic upgrade head
```

### Development

Run the development server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or using Python:
```bash
python -m app.main
```

Access the API:
- API: http://localhost:8000
- Interactive docs (Swagger): http://localhost:8000/api/docs
- Alternative docs (ReDoc): http://localhost:8000/api/redoc

### Testing

Run tests:
```bash
pytest
```

Run tests with coverage:
```bash
pytest --cov=app --cov-report=html
```

## API Structure (Planned)

### Super Admin Endpoints
- `POST /api/auth/admin/login` - Admin login
- `GET /api/admin/clients` - List all clients
- `POST /api/admin/clients` - Create new client
- `GET /api/admin/dashboard/summary` - Dashboard analytics

### Client Endpoints
- `POST /api/auth/client/signup` - Client signup
- `POST /api/auth/client/login` - Client login
- `GET /api/client/requirements` - List requirements
- `POST /api/client/requirements` - Create requirement
- `GET /api/client/candidates` - Search candidates

### Public Candidate Endpoints
- `GET /api/apply/{unique_link}` - Get job details
- `POST /api/apply/{unique_link}/ai-chat` - AI Assistant
- `POST /api/apply/{unique_link}/upload-cv` - CV Evaluator
- `POST /api/apply/{unique_link}/register` - Talent Pool registration

## Database Models

All models are defined in `app/models/` and match the `database_schema_aligned.sql`:

- `SuperAdmin` - Super admin users
- `Client` - Client companies
- `ClientUser` - Multiple users per client
- `ClientSettings` - Client customization & AI knowledge base
- `Requirement` - Job postings
- `Candidate` - Candidate profiles
- `Applicant` - Applications (candidate → requirement)
- `TalentPool` - Candidates in client's database
- `CVUpload` - CV files and AI-parsed data
- `AIInteraction` - AI chat history
- `AnalyticsEvent` - Event tracking
- `Session` - User sessions
- `PasswordResetToken` - Password reset tokens
- And more...

## Environment Variables

See `.env.example` for all required environment variables.

**Critical for production:**
- `JWT_SECRET_KEY` - Must be a secure random string (min 32 chars)
- `DATABASE_URL` - Production PostgreSQL connection
- `DEBUG=False` - Disable debug mode
- `OPENAI_API_KEY` - Required for AI features
- `PINECONE_API_KEY` - Required for RAG knowledge base

## Development Progress

See [PROGRESS.md](../PROGRESS.md) in the root directory for current development status.

## Security Notes

- Never commit `.env` to version control
- Always use strong, random JWT secrets in production
- Enable HTTPS in production
- Implement rate limiting on all endpoints
- Validate and sanitize all user inputs
- Use prepared statements (SQLAlchemy ORM) to prevent SQL injection
- Hash passwords with bcrypt (12+ rounds)

## License

Proprietary
