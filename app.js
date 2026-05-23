import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import aiRoutes from "./routes/ai.js";
import taskRoutes from "./routes/tasks.js";

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.BASE_URL }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/tasks", taskRoutes);

export default app;
