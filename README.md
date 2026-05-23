# SmartPlanner Backend

Express.js REST API for SmartPlanner, backed by Prisma ORM and a PostgreSQL database (NeonDB).

---

## Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- A NeonDB PostgreSQL connection string

---

## Environment Setup

Copy the example env file and fill in the values:

```bash
cp backend/.env.example backend/.env
```

## 1. Run Backend Locally

```bash
cd backend
npm install
npx prisma generate
node server.js
```

The server starts on **http://localhost:3000**.

Health check: `GET /health`

---

## 2. Run Docker Compose (Dev)

```bash
docker compose -f docker-compose.dev.yml up --build
```

The server is available at **http://localhost:3000**.

---

## 3. Stop the Container

```bash
docker compose -f docker-compose.dev.yml stop
```

---

## 4. Delete the Container

```bash
docker compose -f docker-compose.dev.yml down
```

To also remove the built image:

```bash
docker compose -f docker-compose.dev.yml down --rmi local
```
