FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and server package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY shared ./shared

RUN npm install

COPY server/ ./server/
WORKDIR /app/server
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/server/package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/assets ./assets
COPY --from=builder /app/server/data ./data
COPY india_credit_cards.csv ./india_credit_cards.csv

EXPOSE 3001

CMD ["node", "dist/index.js"]
