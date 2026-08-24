# ═══════════════════════════════════════════════════════
# Stage 1: Build Frontend (Client) & Backend (Server)
# ═══════════════════════════════════════════════════════
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and workspace package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
COPY shared/package*.json ./shared/
COPY shared ./shared

# Install all dependencies (including devDependencies needed for build)
RUN npm install

# Copy source code
COPY client ./client
COPY server ./server
COPY india_credit_cards.csv ./india_credit_cards.csv
COPY card_image_naming_guide.csv ./card_image_naming_guide.csv

# Build frontend and backend
RUN npm --prefix client run build
RUN npm --prefix server run build

# ═══════════════════════════════════════════════════════
# Stage 2: Production Runner Image
# ═══════════════════════════════════════════════════════
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy package files and install only production dependencies
COPY package*.json ./
COPY server/package*.json ./server/
COPY shared/package*.json ./shared/
COPY shared ./shared

RUN npm install --omit=dev --prefix server

# Copy built dist and static assets from builder
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/assets ./server/assets
COPY --from=builder /app/server/data ./server/data
COPY --from=builder /app/india_credit_cards.csv ./india_credit_cards.csv
COPY --from=builder /app/card_image_naming_guide.csv ./card_image_naming_guide.csv

# Create uploads directory
RUN mkdir -p server/uploads/cards

EXPOSE 3001

# Start the unified fullstack server
CMD ["node", "server/dist/index.js"]
