import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import binsRouter from "./routes/bins.js";
import aiRouter from "./routes/ai.js";

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://bin-there-done-that-green.vercel.app"
  ]
}));
app.use(express.json());

app.use("/api/bins", binsRouter);
app.use("/api/ai",   aiRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "EcoRoute backend running" });
});

app.listen(PORT, () => {
  console.log(`🚀 EcoRoute server running on http://localhost:${PORT}`);
  console.log(`   Bins API:  http://localhost:${PORT}/api/bins`);
  console.log(`   Stats API: http://localhost:${PORT}/api/bins/stats`);
  console.log(`   AI API:    http://localhost:${PORT}/api/ai/report`);
});