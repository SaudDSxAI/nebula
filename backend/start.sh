#!/bin/sh
set -e

echo "Running migrations..."
alembic upgrade head

echo "Seeding Super Admin..."
python seed_admin.py

echo "Starting FastAPI server on port 8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
