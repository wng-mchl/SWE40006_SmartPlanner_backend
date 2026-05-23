# split to 2 stage for optimization, reduce docker image size
# stage 1: install dependencies and generate prisma client
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev --no-audit --no-fund
RUN npx prisma generate

COPY . .

# stage 2: run the app
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./

EXPOSE 3000
CMD ["node", "server.js"]