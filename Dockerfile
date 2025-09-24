FROM node:18-alpine as frontend-builder

WORKDIR /app
COPY package*.json lerna.json ./
COPY frontend/package*.json ./frontend/
COPY shared/ ./shared/

RUN npm ci
COPY frontend/ ./frontend/
RUN npm run build --workspace=frontend

FROM node:18-alpine as backend-builder
WORKDIR /app

COPY package*.json lerna.json ./
COPY backend/package*.json ./backend/
COPY shared/ ./shared/

RUN npm ci
COPY backend/ ./backend/

RUN npm run build --workspace=backend

FROM node:18-alpine
WORKDIR /app

COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=frontend-builder /app/frontend/build ./frontend/build
COPY --from=backend-builder /app/shared ./shared

WORKDIR /app/backend

RUN npm install --omit=dev

CMD ["node", "dist/backend/src/server.js"]
