import { useState, useEffect } from "react";

const API = "https://civics-hackathon.onrender.com";

const CAMPUS_META = {
  "charles-river": { label: "Charles River", color: "#b45309", bg: "#fef3c7", border: "#fcd34d", emoji: "🎓" },
  "medical":        { label: "Medical",       color: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd", emoji: "🏥" },
  "fenway":         { label: "Fenway",        color: "#0f766e", bg: "#ccfbf1", border: "#5eead4", emoji: "⚾" },
};

function PulsingDot({ color }) {
  return (
    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ backgroundColor: color }} />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: color }} />
    </span>
  );
}

function MiniBar({ pct, color }) {
  return (
    <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export default function HomePage({ setPage }) {
  const [stats,    setStats]    = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/bins/stats`).then(r => r.json()),
      fetch(`${API}/api/bins/hotspot`).then(r => r.json()),
    ]).then(([s, h]) => {
      setStats(s.stats || []);
      setHotspots(h.hotspots || []);
      setLoading(false);
    }).catch(() => { setError(true); setLoading(false); });
  }, []);

  const totalBins     = stats.reduce((a, s) => a + s.total, 0);
  const totalCritical = stats.reduce((a, s) => a + s.critical_trash + s.critical_recycle, 0);
  const urgentTrash   = hotspots.filter(h => h.waste_days_to_80   != null && h.waste_days_to_80   <= 2).length;
  const urgentRecycle = hotspots.filter(h => h.recycle_days_to_80 != null && h.recycle_days_to_80 <= 2).length;
  const overallAvgTrash = stats.length
    ? Math.round(stats.reduce((a, s) => a + s.avg_trash * s.total, 0) / Math.max(totalBins, 1)) : 0;
  const overallAvgRecycle = stats.length
    ? Math.round(stats.reduce((a, s) => a + s.avg_recycle * s.total, 0) / Math.max(totalBins, 1)) : 0;

  const systemHealthScore = loading ? null : Math.max(0, Math.round(
    100 - (totalCritical * 3) - (urgentTrash * 2) - (urgentRecycle * 2)
  ));
  const healthColor = systemHealthScore >= 70 ? "#16a34a" : systemHealthScore >= 40 ? "#d97706" : "#dc2626";
  const healthLabel = systemHealthScore >= 70 ? "Healthy" : systemHealthScore >= 40 ? "Needs Attention" : "Critical";

  return (
    <div className="space-y-6">

      {/* Hero */}
      <div className="rounded-3xl overflow-hidden relative" style={{ background: "linear-gradient(135deg, #1c1917 0%, #292524 60%, #3b1f0a 100%)" }}>
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #f59e0b 0%, transparent 50%), radial-gradient(circle at 80% 20%, #10b981 0%, transparent 40%)" }} />
        <div className="relative px-6 py-8 sm:px-10 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">♻️</span>
                <span className="text-amber-400 text-xs font-bold uppercase tracking-widest">BU Waste Management</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-2" style={{ fontFamily: "'Georgia', serif" }}>
                Bin There,<br />Done That.
              </h1>
              <p className="text-stone-400 text-sm leading-relaxed max-w-sm">
                Real-time monitoring and placement analytics for {loading ? "..." : totalBins} Big Belly bins across Boston University's three campuses.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 bg-white/5 rounded-2xl px-8 py-5 border border-white/10 self-start sm:self-auto">
              <p className="text-stone-400 text-xs font-medium uppercase tracking-wider">System Health</p>
              <div className="relative flex items-center justify-center w-20 h-20">
                <div className="absolute w-20 h-20 rounded-full opacity-20 animate-pulse" style={{ backgroundColor: loading ? "#9ca3af" : healthColor }} />
                <div className="relative text-3xl font-black" style={{ color: loading ? "#9ca3af" : healthColor }}>
                  {loading ? "..." : systemHealthScore}
                </div>
              </div>
              <p className="text-sm font-semibold" style={{ color: loading ? "#9ca3af" : healthColor }}>
                {loading ? "Loading..." : healthLabel}
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm">
          ⚠️ Backend not connected — start your server on port 3001 to see live data.
        </div>
      )}

      {/* Live KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: "🗑️", label: "Total Bins",     value: loading ? "..." : totalBins,                   sub: "across 3 campuses",       accent: false },
          { icon: "🚨", label: "Critical Now",   value: loading ? "..." : totalCritical,               sub: "streams ≥ 85% full",      accent: totalCritical > 0 },
          { icon: "⏰", label: "Urgent Pickups", value: loading ? "..." : urgentTrash + urgentRecycle, sub: "collect within 2 days",   accent: (urgentTrash + urgentRecycle) > 0 },
          { icon: "📍", label: "Coverage Gaps",  value: loading ? "..." : 8,                           sub: "suggested new locations", accent: false },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 border ${s.accent ? "bg-red-50 border-red-200" : "bg-white border-stone-200"}`}>
            <div className="text-xl mb-2">{s.icon}</div>
            <div className={`text-2xl font-black ${s.accent ? "text-red-700" : "text-stone-800"}`}>{s.value}</div>
            <div className={`text-xs font-semibold ${s.accent ? "text-red-700" : "text-stone-700"}`}>{s.label}</div>
            <div className="text-xs text-stone-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Overall fill snapshot */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>System Fill Snapshot</h2>
            <p className="text-xs text-stone-400">Average fill levels across all monitored bins</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-stone-400">
            <PulsingDot color="#16a34a" />
            <span>Live</span>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-semibold text-stone-600">🗑️ Trash — all campuses</span>
              <span className="font-bold" style={{ color: overallAvgTrash >= 65 ? "#d97706" : "#16a34a" }}>
                {loading ? "..." : overallAvgTrash}%
              </span>
            </div>
            <MiniBar pct={overallAvgTrash} color={overallAvgTrash >= 65 ? "#d97706" : "#16a34a"} />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-semibold text-stone-600">♻️ Recycle — all campuses</span>
              <span className="font-bold" style={{ color: overallAvgRecycle >= 65 ? "#d97706" : "#16a34a" }}>
                {loading ? "..." : overallAvgRecycle}%
              </span>
            </div>
            <MiniBar pct={overallAvgRecycle} color={overallAvgRecycle >= 65 ? "#d97706" : "#16a34a"} />
          </div>
        </div>
      </div>

      {/* Per-campus status cards */}
      <div>
        <h2 className="font-bold text-stone-800 mb-3" style={{ fontFamily: "'Georgia', serif" }}>Campus Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(CAMPUS_META).map(([key, m]) => {
            const s  = stats.find(x => x.campus === key) || {};
            const hs = hotspots.filter(x => x.campus === key);
            const campusUrgent = hs.filter(h => (h.waste_days_to_80 ?? 99) <= 2 || (h.recycle_days_to_80 ?? 99) <= 2).length;
            const campusCrit   = (s.critical_trash || 0) + (s.critical_recycle || 0);
            const hasAlert     = campusUrgent > 0 || campusCrit > 0;
            return (
              <div key={key} className="bg-white rounded-2xl border-2 overflow-hidden hover:shadow-md transition-shadow"
                style={{ borderColor: hasAlert ? "#fca5a5" : m.border }}>
                <div className="px-5 py-4" style={{ backgroundColor: m.bg }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{m.emoji}</span>
                      <div>
                        <p className="font-bold text-stone-800 text-sm">BU {m.label}</p>
                        <p className="text-xs text-stone-500">{loading ? "..." : s.total || 0} bins installed</p>
                      </div>
                    </div>
                    {hasAlert && <PulsingDot color="#dc2626" />}
                  </div>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>
                      <p className="text-lg font-black text-stone-800">{loading ? "..." : s.avg_trash || 0}%</p>
                      <p className="text-[10px] text-stone-400">avg trash</p>
                    </div>
                    <div>
                      <p className="text-lg font-black text-stone-800">{loading ? "..." : s.avg_recycle || 0}%</p>
                      <p className="text-[10px] text-stone-400">avg recycle</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <MiniBar pct={s.avg_trash   || 0} color={m.color} />
                    <MiniBar pct={s.avg_recycle || 0} color={m.color} />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {campusCrit > 0 && (
                      <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        🚨 {campusCrit} critical
                      </span>
                    )}
                    {campusUrgent > 0 && (
                      <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        ⏰ {campusUrgent} urgent
                      </span>
                    )}
                    {!campusCrit && !campusUrgent && (
                      <span className="text-green-600 text-[10px] font-semibold">✅ All clear</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-bold text-stone-800 mb-3" style={{ fontFamily: "'Georgia', serif" }}>Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { page: "map",       icon: "🗺️", title: "Open Map",         desc: "View real-time bin fill levels and hotspot analysis",    color: "#b45309" },
            { page: "analytics", icon: "📊", title: "View Analytics",   desc: "Detailed charts, trends, and collection urgency",        color: "#7c3aed" },
            { page: "map",       icon: "🔥", title: "Hotspot Analysis", desc: "See overwhelmed bins, underused bins, and coverage gaps", color: "#dc2626" },
          ].map(a => (
            <button key={a.title} onClick={() => setPage(a.page)}
              className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition-all hover:border-stone-300 text-left group">
              <div className="text-2xl mb-3">{a.icon}</div>
              <p className="font-bold text-stone-800 text-sm">{a.title}</p>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">{a.desc}</p>
              <div className="mt-3 text-xs font-semibold flex items-center gap-1" style={{ color: a.color }}>
                Open <span>→</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="text-center text-xs text-stone-400 pb-4">
        Data sourced from BU Big Belly sensor network · {loading ? "..." : totalBins} units across Charles River, Medical, and Fenway campuses
      </div>

    </div>
  );
}
