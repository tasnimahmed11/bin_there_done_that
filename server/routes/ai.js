import { Router } from "express";
import OpenAI from "openai";
import db from "../db/database.js";

const router = Router();
const getClient = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Build a data summary string to inject into every LLM prompt ───────────────
function buildDataContext() {
  const bins = db.prepare("SELECT * FROM bins ORDER BY campus, trash_fill DESC").all();
  const stats = db.prepare(`
    SELECT
      campus,
      COUNT(*) AS total,
      ROUND(AVG(trash_fill),   1) AS avg_trash,
      ROUND(AVG(recycle_fill), 1) AS avg_recycle,
      SUM(CASE WHEN trash_fill   >= 85 THEN 1 ELSE 0 END) AS critical_trash,
      SUM(CASE WHEN recycle_fill >= 85 THEN 1 ELSE 0 END) AS critical_recycle
    FROM bins GROUP BY campus
  `).all();

  const campusLines = stats.map(s =>
    `- ${s.campus}: ${s.total} bins | avg trash ${s.avg_trash}% | avg recycle ${s.avg_recycle}% | ${s.critical_trash} critical trash | ${s.critical_recycle} critical recycle`
  ).join("\n");

  const criticalBins = bins
    .filter(b => b.trash_fill >= 85 || b.recycle_fill >= 85)
    .map(b => `  [${b.campus}] ${b.notes || b.address} — trash ${b.trash_fill}% / recycle ${b.recycle_fill}%`)
    .join("\n");

  return `
BU CAMPUS WASTE DATA SUMMARY
=============================
Total BU Big Belly bins: ${bins.length}

Campus Breakdown:
${campusLines}

Critical Bins (≥85% full):
${criticalBins || "None currently critical"}

Note: Fill levels are sensor readings from BU's Big Belly smart bins.
Each belly bin unit contains one trash compartment and one recycle compartment.
  `.trim();
}

const SYSTEM_PROMPT = `You are EcoRoute, a smart waste management assistant for Boston University.
You have access to real-time fill level data for BU's Big Belly bins across three campuses:
Charles River, Medical, and Fenway.
Answer questions concisely and accurately based only on the data provided.
If asked about something outside the data, say so clearly.
Keep responses under 150 words unless a detailed breakdown is requested.`;

// ── POST /api/ai/report  — generate an overview report ────────────────────────
router.post("/report", async (req, res) => {
  try {
    const context = buildDataContext();
    const { campus } = req.body;

    const prompt = campus
      ? `Generate a concise waste management report for BU's ${campus} campus based on this data. Include: current fill status, which bins need pickup urgently, patterns you notice, and a recommended action. Keep it under 200 words.`
      : `Generate a concise overview waste management report for all BU campuses based on this data. Include: overall status, most critical locations, any patterns, and top 3 recommended actions. Keep it under 250 words.`;

    const response = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 500,
      messages: [
        { role: "system",    content: SYSTEM_PROMPT },
        { role: "user",      content: `${context}\n\n${prompt}` },
      ],
    });

    res.json({
      success: true,
      report:  response.choices[0].message.content,
      context: { campus: campus || "all" },
    });
  } catch (err) {
    console.error("AI report error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/ai/chat  — answer questions about the bin data ──────────────────
router.post("/chat", async (req, res) => {
  try {
    const { question, history = [] } = req.body;
    if (!question) return res.status(400).json({ success: false, error: "question is required" });

    const context = buildDataContext();

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      // Inject live data as context
      {
        role: "user",
        content: `Here is the current bin data you have access to:\n\n${context}\n\nI'll now ask you questions about this data.`,
      },
      {
        role: "assistant",
        content: "Got it! I have the current fill level data for all BU campus bins. Ask me anything about the waste status, which bins need pickup, campus comparisons, or recommendations.",
      },
      // Prior conversation turns
      ...history.map(msg => ({ role: msg.role, content: msg.content })),
      // New question
      { role: "user", content: question },
    ];

    const response = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 400,
      messages,
    });

    res.json({
      success:  true,
      answer:   response.choices[0].message.content,
      question,
    });
  } catch (err) {
    console.error("AI chat error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;