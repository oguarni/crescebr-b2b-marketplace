# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files for frontend and shared workspace
COPY frontend/package*.json ./
COPY package-lock.json ./
COPY shared/package*.json ./shared/

# Install dependencies for both
RUN npm install
RUN npm install --prefix ./shared

# Copy source code
COPY frontend/ .
COPY shared/ ./shared/

# Use Docker-specific TypeScript configuration
COPY frontend/tsconfig.docker.json ./tsconfig.json

# Build the application
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:1.25-alpine

# Copy the built files from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the custom Nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for Nginx
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]