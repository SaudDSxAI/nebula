FROM node:20-alpine

# Set working directory
WORKDIR /app

# Consume Railway's environment variables during the Docker build process
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Copy package management files to utilize Docker cache effectively
COPY package.json package-lock.json* ./

# Install project dependencies
RUN npm install

# Copy application files
COPY . .

# Build the application
RUN npm run build

EXPOSE 3000

# Default command for production
CMD ["npm", "run", "start"]
