FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package management files to utilize Docker cache effectively
COPY package.json package-lock.json* ./

# Install project dependencies
RUN npm install

# Copy application files
COPY . .

# Temporarily omitting "RUN npm run build" 
# For local dev environments via docker-compose, "npm run dev" is invoked.
# (If building for Railway, Railway detects this file and you can run build steps there)

EXPOSE 3000

# Default command for development 
CMD ["npm", "run", "dev"]
