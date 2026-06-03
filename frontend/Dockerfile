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

# Ensure every served file is world-readable. Cloud Build uploads the working
# tree with its on-disk permissions, which can be group-only (e.g. 660); without
# this, nginx's unprivileged worker cannot read those assets and returns 403.
RUN chmod -R a+rX /usr/share/nginx/html

# Nginx config is a template: the official entrypoint runs envsubst on it at
# startup, injecting PORT (set by Cloud Run) and BACKEND_HOST (the backend host).
COPY frontend/nginx.conf.template /etc/nginx/templates/default.conf.template

# Only substitute our own variables, never nginx runtime variables ($uri, $host, ...).
ENV NGINX_ENVSUBST_FILTER="^(PORT|BACKEND_HOST)$"
ENV PORT=8080
ENV BACKEND_HOST=localhost

EXPOSE 8080

# Entrypoint (envsubst on templates) and CMD are inherited from the nginx base image.