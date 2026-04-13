# Etapa 1: Construcción
FROM node:20.19-alpine AS build
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
# Limpiar por si hay problemas con rolldown
RUN rm -rf node_modules package-lock.json
RUN npm install --legacy-peer-deps
RUN npm run build

# Etapa 2: Servidor de producción
FROM nginx:stable-alpine
# Copiamos los archivos compilados a la carpeta de Nginx
COPY --from=build /app/dist /usr/share/nginx/html
# Copiamos la configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]