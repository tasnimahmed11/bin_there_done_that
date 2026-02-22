import { useState, useEffect } from "react";

const API = "https://civics-hackathon.onrender.com";

const CAMPUS_COLORS = {
  "charles-river": { primary: "#b45309", light: "#fef3c7", border: "#fcd34d", label: "Charles River" },
  "medical":        { primary: "#7c3aed", light: "#ede9fe", border: "#c4b5fd", label: "Medical"       },
  "fenway":         { primary: "#0f766e", light: "#ccfbf1", border: "#5eead4", label: "Fenway"        },
};

function StatCard({ icon, label, value, sub, color, large }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />}
      </div>
      <div className={`font-bold text-stone-800 ${large ? "text-3xl" : "text-2xl"}`}>{value}</div>
      <div className="text-sm font-medium text-stone-600">{label}</div>
      {sub && <div className="text-xs text-stone-400">{sub}</div>}
    </div>
  );
}

// Simple horizontal bar
function HBar({ value, max, color, label, sublabel }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-xs text-stone-600 font-medium text-right flex-shrink-0 truncate">{label}</div>
      <div className="flex-1 h-5 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color, minWidth: value > 0 ? 28 : 0 }}>
          <span className="text-white text-[10px] font-bold">{value}</span>
        </div>
      </div>
      {sublabel && <div className="text-xs text-stone-400 w-16 flex-shrink-0">{sublabel}</div>}
    </div>
  );
}

// Donut-style fill gauge
function FillGauge({ pct, color, label, size = 80 }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f5f5f4" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: "stroke-dasharray 0.8s ease" }} />
        <text x={size/2} y={size/2 + 5} textAnchor="middle" fontSize={14} fontWeight="bold" fill={color}>{pct}%</text>
      </svg>
      <span className="text-xs text-stone-500 font-medium text-center">{label}</span>
    </div>
  );
}

// Vertical bar chart
function VBarChart({ data, colorKey = "color", valueKey = "value", labelKey = "label", maxOverride }) {
  const max = maxOverride || Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div className="flex items-end gap-2 h-36">
      {data.map((d, i) => {
        const pct = Math.min(100, (d[valueKey] / max) * 100);
        return (
          <div key={i} className="flex flex-col items-center flex-1 gap-1">
            <span className="text-xs font-bold text-stone-700">{d[valueKey]}</span>
            <div className="w-full rounded-t-md transition-all duration-700"
              style={{ height: `${Math.max(pct * 1.1, d[valueKey] > 0 ? 4 : 0)}px`, backgroundColor: d[colorKey] }} />
            <span className="text-[10px] text-stone-400 text-center leading-tight">{d[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const [stats,    setStats]    = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [allBins,  setAllBins]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [campus,   setCampus]   = useState("all");

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/bins/stats`).then(r => r.json()),
      fetch(`${API}/api/bins/hotspot`).then(r => r.json()),
      fetch(`${API}/api/bins`).then(r => r.json()),
    ]).then(([s, h, b]) => {
      setStats(s.stats || []);
      setHotspots(h.hotspots || []);
      setAllBins(b.bins || []);
      setLoading(false);
    }).catch(() => { setError("Cannot connect to backend on port 3001."); setLoading(false); });
  }, []);

  // Filtered by campus selector
  const filteredHotspots = campus === "all" ? hotspots : hotspots.filter(h => h.campus === campus);
  const filteredBins     = campus === "all" ? allBins  : allBins.filter(b => b.campus === campus);
  const filteredStats    = campus === "all" ? stats    : stats.filter(s => s.campus === campus);

  // Aggregate stats
  const totalBins      = filteredStats.reduce((a, s) => a + s.total, 0);
  const avgTrash       = filteredStats.length ? Math.round(filteredStats.reduce((a, s) => a + s.avg_trash * s.total, 0) / Math.max(totalBins, 1)) : 0;
  const avgRecycle     = filteredStats.length ? Math.round(filteredStats.reduce((a, s) => a + s.avg_recycle * s.total, 0) / Math.max(totalBins, 1)) : 0;
  const criticalBins   = filteredStats.reduce((a, s) => a + s.critical_trash + s.critical_recycle, 0);
  const hotCount       = filteredHotspots.filter(h => h.placement_status === "hot").length;
  const goodCount      = filteredHotspots.filter(h => h.placement_status === "good").length;
  const coldCount      = filteredHotspots.filter(h => h.placement_status === "cold").length;
  const urgentTrash    = filteredHotspots.filter(h => h.waste_days_to_80   != null && h.waste_days_to_80   <= 2).length;
  const urgentRecycle  = filteredHotspots.filter(h => h.recycle_days_to_80 != null && h.recycle_days_to_80 <= 2).length;
  const soonTrash      = filteredHotspots.filter(h => h.waste_days_to_80   > 2 && h.waste_days_to_80   <= 5).length;
  const soonRecycle    = filteredHotspots.filter(h => h.recycle_days_to_80 > 2 && h.recycle_days_to_80 <= 5).length;
  const okTrash        = filteredHotspots.filter(h => h.waste_days_to_80   > 5).length;
  const okRecycle      = filteredHotspots.filter(h => h.recycle_days_to_80 > 5).length;

  // Fill level distribution buckets for current filtered bins
  const fillBuckets = (key) => ({
    critical: filteredBins.filter(b => b[key] >= 85).length,
    high:     filteredBins.filter(b => b[key] >= 65 && b[key] < 85).length,
    medium:   filteredBins.filter(b => b[key] >= 40 && b[key] < 65).length,
    low:      filteredBins.filter(b => b[key] < 40).length,
  });
  const trashDist   = fillBuckets("trash_fill");
  const recycleDist = fillBuckets("recycle_fill");

  // Per-campus bar chart data
  const campusChartData = Object.entries(CAMPUS_COLORS).map(([key, m]) => {
    const s = stats.find(x => x.campus === key) || {};
    return {
      label: m.label.replace("Charles River", "C. River"),
      value: s.total || 0,
      color: m.primary,
      avgTrash: s.avg_trash || 0,
    };
  });

  // Top 10 busiest bins (lowest avg days to fill)
  const busiestBins = [...filteredHotspots]
    .filter(h => h.waste_days_to_fill != null && h.lat != null)
    .sort((a, b) => a.waste_days_to_fill - b.waste_days_to_fill)
    .slice(0, 10);

  // Top 5 most overdue for collection
  const overdueTrash = [...filteredHotspots]
    .filter(h => h.waste_days_to_80 != null && h.lat != null)
    .sort((a, b) => a.waste_days_to_80 - b.waste_days_to_80)
    .slice(0, 5);

  const overdueRecycle = [...filteredHotspots]
    .filter(h => h.recycle_days_to_80 != null && h.lat != null)
    .sort((a, b) => a.recycle_days_to_80 - b.recycle_days_to_80)
    .slice(0, 5);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-stone-400 animate-pulse">Loading analytics data...</p>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">⚠️ {error}</div>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>Analytics</h1>
          <p className="text-xs text-stone-400 mt-0.5">Real-time insights from BU Big Belly sensor data</p>
        </div>
        {/* Campus filter */}
        <div className="flex bg-stone-100 rounded-xl p-1 gap-1 self-start">
          {[{ val: "all", label: "All Campuses" }, ...Object.entries(CAMPUS_COLORS).map(([k, m]) => ({ val: k, label: m.label.replace("Charles River", "C. River") }))].map(opt => (
            <button key={opt.val} onClick={() => setCampus(opt.val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${campus === opt.val ? "bg-white shadow text-stone-800" : "text-stone-500"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="🗑️" label="Total Bins" value={totalBins} sub="BU Big Belly units" large />
        <StatCard icon="🚨" label="Critical Right Now" value={criticalBins} sub="streams ≥ 85% full" color="#dc2626" large />
        <StatCard icon="🔴" label="Overwhelmed Bins" value={hotCount} sub="fill in < 3 days" color="#dc2626" />
        <StatCard icon="⚫" label="Underused Bins" value={coldCount} sub="fill in > 20 days" color="#6b7280" />
      </div>

      {/* Fill level gauges + campus breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Average fill gauges */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h2 className="font-bold text-stone-800 mb-1" style={{ fontFamily: "'Georgia', serif" }}>Average Fill Levels</h2>
          <p className="text-xs text-stone-400 mb-5">Current snapshot across {campus === "all" ? "all campuses" : CAMPUS_COLORS[campus]?.label}</p>
          <div className="flex justify-around">
            <FillGauge pct={avgTrash}   color="#b45309" label="Avg Trash"   size={110} />
            <FillGauge pct={avgRecycle} color="#15803d" label="Avg Recycle" size={110} />
          </div>
        </div>

        {/* Bins per campus */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h2 className="font-bold text-stone-800 mb-1" style={{ fontFamily: "'Georgia', serif" }}>Bins by Campus</h2>
          <p className="text-xs text-stone-400 mb-4">Total Big Belly units installed</p>
          <VBarChart data={campusChartData} maxOverride={80} />
        </div>
      </div>

      {/* Fill distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: "🗑️ Trash Fill Distribution", dist: trashDist, color: "#b45309" },
          { title: "♻️ Recycle Fill Distribution", dist: recycleDist, color: "#15803d" },
        ].map(({ title, dist, color }) => (
          <div key={title} className="bg-white rounded-2xl border border-stone-200 p-5">
            <h2 className="font-bold text-stone-800 mb-4" style={{ fontFamily: "'Georgia', serif" }}>{title}</h2>
            <div className="space-y-3">
              <HBar value={dist.critical} max={totalBins} color="#dc2626" label="Critical (≥85%)" sublabel="needs pickup" />
              <HBar value={dist.high}     max={totalBins} color="#d97706" label="High (65–84%)"   sublabel="monitor" />
              <HBar value={dist.medium}   max={totalBins} color="#ca8a04" label="Medium (40–64%)" sublabel="ok" />
              <HBar value={dist.low}      max={totalBins} color="#16a34a" label="Low (<40%)"      sublabel="fine" />
            </div>
          </div>
        ))}
      </div>

      {/* Collection urgency */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <h2 className="font-bold text-stone-800 mb-1" style={{ fontFamily: "'Georgia', serif" }}>Collection Urgency</h2>
        <p className="text-xs text-stone-400 mb-5">Based on estimated days until each bin reaches 80% capacity</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {[
            { stream: "🗑️ Trash Collector",   urgent: urgentTrash,   soon: soonTrash,   ok: okTrash   },
            { stream: "♻️ Recycle Collector", urgent: urgentRecycle, soon: soonRecycle, ok: okRecycle },
          ].map(s => (
            <div key={s.stream}>
              <p className="text-sm font-semibold text-stone-700 mb-3">{s.stream}</p>
              <div className="space-y-3">
                <HBar value={s.urgent} max={filteredHotspots.length} color="#dc2626" label="Urgent (≤ 2d)"  sublabel="collect now" />
                <HBar value={s.soon}   max={filteredHotspots.length} color="#d97706" label="Soon (2–5d)"    sublabel="this week" />
                <HBar value={s.ok}     max={filteredHotspots.length} color="#16a34a" label="On track (>5d)" sublabel="scheduled" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Placement health */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <h2 className="font-bold text-stone-800 mb-1" style={{ fontFamily: "'Georgia', serif" }}>Bin Placement Health</h2>
        <p className="text-xs text-stone-400 mb-5">How well-placed are current bins based on historical fill rate?</p>
        <div className="space-y-3">
          <HBar value={hotCount}  max={filteredHotspots.length} color="#dc2626" label="🔴 Overwhelmed" sublabel="< 3 days to fill" />
          <HBar value={goodCount} max={filteredHotspots.length} color="#16a34a" label="🟢 Well Placed" sublabel="3–20 days"        />
          <HBar value={coldCount} max={filteredHotspots.length} color="#6b7280" label="⚫ Underused"   sublabel="> 20 days"        />
        </div>
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
          💡 <strong>{coldCount} underused bin{coldCount !== 1 ? "s" : ""}</strong> could be relocated to the{" "}
          <strong>8 identified coverage gaps</strong> on Charles River campus to better serve high foot-traffic areas.
        </div>
      </div>

      {/* Top 10 busiest bins */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-bold text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>Top 10 Busiest Bins</h2>
          <p className="text-xs text-stone-400 mt-0.5">Ranked by fastest average fill rate (trash stream)</p>
        </div>
        <div className="divide-y divide-stone-50">
          {busiestBins.map((bin, i) => {
            const campusColor = CAMPUS_COLORS[bin.campus]?.primary || "#b45309";
            const daysColor = bin.waste_days_to_fill < 3 ? "#dc2626" : bin.waste_days_to_fill < 7 ? "#d97706" : "#16a34a";
            return (
              <div key={bin.id} className="flex items-center gap-4 px-5 py-3">
                <span className="text-lg font-black text-stone-300 w-6">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-800 text-sm truncate">{bin.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: campusColor }} />
                    <span className="text-xs text-stone-400">{CAMPUS_COLORS[bin.campus]?.label || bin.campus}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold" style={{ color: daysColor }}>{bin.waste_days_to_fill?.toFixed(1)} days</p>
                  <p className="text-[10px] text-stone-400">avg to fill</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collection schedule preview — side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: "🗑️ Trash — Most Urgent",   bins: overdueTrash,   daysKey: "waste_days_to_80"   },
          { title: "♻️ Recycle — Most Urgent", bins: overdueRecycle, daysKey: "recycle_days_to_80" },
        ].map(({ title, bins, daysKey }) => (
          <div key={title} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-100">
              <h2 className="font-semibold text-stone-700 text-sm">{title}</h2>
              <p className="text-xs text-stone-400">Bins closest to needing pickup</p>
            </div>
            <div className="divide-y divide-stone-50">
              {bins.map(bin => {
                const days = bin[daysKey];
                const color = days <= 2 ? "#dc2626" : days <= 5 ? "#d97706" : "#16a34a";
                const label = days <= 2 ? "Urgent" : days <= 5 ? "Soon" : "OK";
                return (
                  <div key={bin.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-800 truncate">{bin.description}</p>
                      <p className="text-xs text-stone-400">{CAMPUS_COLORS[bin.campus]?.label || bin.campus}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold" style={{ color }}>{days?.toFixed(1)}d</p>
                      <p className="text-[10px] font-semibold" style={{ color }}>{label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Per-campus breakdown table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-bold text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>Campus Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-semibold">Campus</th>
                <th className="px-5 py-3 text-right font-semibold">Bins</th>
                <th className="px-5 py-3 text-right font-semibold">Avg Trash</th>
                <th className="px-5 py-3 text-right font-semibold">Avg Recycle</th>
                <th className="px-5 py-3 text-right font-semibold">Critical</th>
                <th className="px-5 py-3 text-right font-semibold">Overwhelmed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {Object.entries(CAMPUS_COLORS).map(([key, m]) => {
                const s = stats.find(x => x.campus === key) || {};
                const h = hotspots.filter(x => x.campus === key);
                const overwhelmed = h.filter(x => x.placement_status === "hot").length;
                const critical = (s.critical_trash || 0) + (s.critical_recycle || 0);
                return (
                  <tr key={key} className="hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.primary }} />
                        <span className="font-medium text-stone-700">{m.label}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-stone-700">{s.total || 0}</td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-semibold" style={{ color: s.avg_trash >= 65 ? "#d97706" : "#16a34a" }}>{s.avg_trash || 0}%</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-semibold" style={{ color: s.avg_recycle >= 65 ? "#d97706" : "#16a34a" }}>{s.avg_recycle || 0}%</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {critical > 0
                        ? <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full text-xs">{critical}</span>
                        : <span className="text-stone-300">0</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-semibold text-stone-600">{overwhelmed}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}