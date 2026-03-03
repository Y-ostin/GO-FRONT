# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Build arguments (se hornean en el JS en tiempo de compilación)
ARG VITE_API_URL=http://localhost:8090
ARG VITE_MQTT_URL=wss://s9a612f1.ala.eu-central-1.emqxsl.com:8084/mqtt
ARG VITE_MQTT_USER=ccip-admin
ARG VITE_MQTT_PASS=12345678

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_MQTT_URL=$VITE_MQTT_URL
ENV VITE_MQTT_USER=$VITE_MQTT_USER
ENV VITE_MQTT_PASS=$VITE_MQTT_PASS

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Copy custom nginx config if needed
# COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
