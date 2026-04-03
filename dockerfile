# -------- BUILD STAGE --------
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# -------- RUNTIME STAGE --------
FROM node:20-slim

WORKDIR /app

# solo deps di produzione
COPY package*.json ./
RUN npm ci --omit=dev

# codice compilato
COPY --from=builder /app/dist ./dist


# cartella uploads
RUN mkdir -p /app/uploads

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/index.js"]