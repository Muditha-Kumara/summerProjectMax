# Stage 1: Build
FROM node:20-alpine AS builder

ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy SSL certificates (will be mounted from host in docker-compose)
# For production, these should be real certificates
RUN mkdir -p /etc/nginx/ssl

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
