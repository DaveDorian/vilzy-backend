FROM node:20-alpine

WORKDIR /app

# 1. Instalar dependencias
COPY package*.json ./
RUN rm -rf dist node_modules
COPY prisma ./prisma/
RUN npm install
RUN npx prisma generate

# 2. Construir la aplicación
COPY . .
RUN npm run build

# 3. Configurar ejecución
EXPOSE 3000

# Ejecutar migraciones, seed y arrancar
CMD npx prisma migrate deploy && npx prisma db seed && node dist/src/main