import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import taskRoutes from "./routes/tasks.js";
import aiRoutes from "./routes/ai.js";

dotenv.config();

const app = express();

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : [];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
}));

app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true, version: "1.1.5" }))
app.get("/alive", (req, res) => res.json({ alive: true, version: "1.1.5" }))

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/ai", aiRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
