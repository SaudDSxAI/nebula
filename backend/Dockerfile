FROM python:3.11-slim

WORKDIR /app

# Install necessary system dependencies for PostgreSQL and building Python packages
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend codebase
COPY . .

# Expose port for FastAPI
EXPOSE 8000

# Make start script executable
RUN chmod +x start.sh

# Command to run the application (production fallback, usually overridden in docker-compose for dev)
CMD ["./start.sh"]
