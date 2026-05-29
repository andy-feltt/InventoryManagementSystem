FROM node:24-alpine AS build
WORKDIR /app
COPY frontend/inventory-management-client/package*.json ./
RUN npm ci
COPY frontend/inventory-management-client/ ./
ARG VITE_API_URL=http://localhost:5000/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/inventory-management-client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
