# Stage 1: Build stage
FROM node:20-alpine AS build

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY backend/package*.json ./
RUN npm install

# Copy shared workspace
COPY shared ./shared

# Copy backend source code
COPY backend/ ./

# Use Docker-specific TypeScript configuration
COPY backend/tsconfig.docker.json ./tsconfig.json

# Use Docker-specific types configuration
COPY backend/src/types/docker.ts ./src/types/index.ts

# Set build-time argument for environment
ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

# Build TypeScript
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine

WORKDIR /usr/src/app

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Copy dependencies from build stage
COPY --from=build /usr/src/app/node_modules ./node_modules
# Copy built code from build stage
COPY --from=build /usr/src/app/dist ./dist
# Copy migrations and seeders
COPY --from=build /usr/src/app/migrations ./migrations
COPY --from=build /usr/src/app/seeders ./seeders
# Copy config and package.json
COPY backend/config/config.json ./config/config.json
COPY backend/package.json .
# Copy wait-for-it and start scripts
COPY backend/wait-for-it.sh ./wait-for-it.sh
COPY backend/start.sh ./start.sh
RUN chmod +x ./wait-for-it.sh ./start.sh

# Install sequelize-cli globally to run migrations
RUN npm install -g sequelize-cli

RUN chown -R node:node /usr/src/app
USER node

# Expose port
EXPOSE 3001

# Command to run the application with retry logic
CMD ["./start.sh"]