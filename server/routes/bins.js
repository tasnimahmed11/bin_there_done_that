import { Router } from "express";
import db from "../db/database.js";

const router = Router();

// GET /api/bins?campus=charles-river
router.get("/", (req, res) => {
  const { campus } = req.query;
  try {
    const query = campus
      ? db.prepare("SELECT * FROM bins WHERE campus = ? ORDER BY trash_fill DESC").all(campus)
      : db.prepare("SELECT * FROM bins ORDER BY campus, trash_fill DESC").all();
    res.json({ success: true, count: query.length, bins: query });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/bins/stats
router.get("/stats", (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT campus, COUNT(*) AS total,
        ROUND(AVG(trash_fill),1) AS avg_trash, ROUND(AVG(recycle_fill),1) AS avg_recycle,
        SUM(CASE WHEN trash_fill >= 85 THEN 1 ELSE 0 END) AS critical_trash,
        SUM(CASE WHEN recycle_fill >= 85 THEN 1 ELSE 0 END) AS critical_recycle
      FROM bins GROUP BY campus
    `).all();
    res.json({ success: true, stats });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/bins/critical
router.get("/critical", (req, res) => {
  const threshold = parseInt(req.query.threshold) || 85;
  try {
    const bins = db.prepare("SELECT * FROM bins WHERE trash_fill >= ? OR recycle_fill >= ? ORDER BY MAX(trash_fill, recycle_fill) DESC").all(threshold, threshold);
    res.json({ success: true, count: bins.length, bins });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/bins/city
router.get("/city", (req, res) => {
  try {
    const bins = db.prepare("SELECT * FROM city_bins").all();
    res.json({ success: true, count: bins.length, bins });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/bins/hotspot?campus=charles-river
router.get("/hotspot", (req, res) => {
  const { campus } = req.query;
  try {
    const query = campus
      ? db.prepare("SELECT * FROM hotspot_analysis WHERE campus = ? AND lat IS NOT NULL ORDER BY hotspot_score DESC").all(campus)
      : db.prepare("SELECT * FROM hotspot_analysis WHERE lat IS NOT NULL ORDER BY hotspot_score DESC").all();
    res.json({ success: true, count: query.length, hotspots: query });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PATCH /api/bins/:id
router.patch("/:id", (req, res) => {
  const { id } = req.params;
  const { trash_fill, recycle_fill } = req.body;
  try {
    db.prepare("UPDATE bins SET trash_fill = COALESCE(?, trash_fill), recycle_fill = COALESCE(?, recycle_fill), last_updated = datetime('now') WHERE id = ?")
      .run(trash_fill ?? null, recycle_fill ?? null, id);
    const updated = db.prepare("SELECT * FROM bins WHERE id = ?").get(id);
    res.json({ success: true, bin: updated });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;