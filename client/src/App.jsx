import { useState, useEffect } from "react";

// ─── Mock Data ────────────────────────────────────────────────────────────────
const CAMPUSES = ["All Campuses", "BU Charles River", "BU Medical", "BU Fenway", "Northeastern", "MIT"];

const MOCK_BINS = [
  // BU Charles River
  { id: 1, campus: "BU Charles River", location: "GSU Plaza", fill: 92, lat: 42.3505, lng: -71.1054, lastPickup: "2h ago" },
  { id: 2, campus: "BU Charles River", location: "Marsh Plaza", fill: 45, lat: 42.3496, lng: -71.1003, lastPickup: "5h ago" },
  { id: 3, campus: "BU Charles River", location: "CAS Building", fill: 78, lat: 42.3508, lng: -71.1078, lastPickup: "3h ago" },
  { id: 4, campus: "BU Charles River", location: "Agganis Arena", fill: 31, lat: 42.3528, lng: -71.1133, lastPickup: "1h ago" },
  { id: 5, campus: "BU Charles River", location: "Questrom School", fill: 67, lat: 42.3491, lng: -71.0976, lastPickup: "4h ago" },
  // BU Medical
  { id: 6, campus: "BU Medical", location: "L-Building", fill: 88, lat: 42.3356, lng: -71.0723, lastPickup: "6h ago" },
  { id: 7, campus: "BU Medical", location: "BUSM Courtyard", fill: 55, lat: 42.3362, lng: -71.0731, lastPickup: "3h ago" },
  // BU Fenway
  { id: 8, campus: "BU Fenway", location: "Fenway Main", fill: 72, lat: 42.3453, lng: -71.0994, lastPickup: "2h ago" },
  // Northeastern
  { id: 9, campus: "Northeastern", location: "Snell Library", fill: 95, lat: 42.3398, lng: -71.0892, lastPickup: "7h ago" },
  { id: 10, campus: "Northeastern", location: "Curry Center", fill: 40, lat: 42.3404, lng: -71.0876, lastPickup: "2h ago" },
  // MIT
  { id: 11, campus: "MIT", location: "Stata Center", fill: 83, lat: 42.3617, lng: -71.0907, lastPickup: "4h ago" },
  { id: 12, campus: "MIT", location: "Killian Court", fill: 29, lat: 42.3601, lng: -71.0942, lastPickup: "1h ago" },
];

const WEEKLY_DATA = [
  { day: "Mon", collections: 14, avgFill: 68 },
  { day: "Tue", collections: 18, avgFill: 74 },
  { day: "Wed", collections: 12, avgFill: 55 },
  { day: "Thu", collections: 20, avgFill: 82 },
  { day: "Fri", collections: 22, avgFill: 89 },
  { day: "Sat", collections: 9, avgFill: 43 },
  { day: "Sun", collections: 6, avgFill: 31 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getFillColor = (fill) => {
  if (fill >= 85) return { bg: "bg-red-100", text: "text-red-700", bar: "bg-red-500", dot: "#ef4444", label: "Critical" };
  if (fill >= 60) return { bg: "bg-amber-100", text: "text-amber-700", bar: "bg-amber-500", dot: "#f59e0b", label: "High" };
  if (fill >= 35) return { bg: "bg-yellow-100", text: "text-yellow-700", bar: "bg-yellow-400", dot: "#eab308", label: "Medium" };
  return { bg: "bg-emerald-100", text: "text-emerald-700", bar: "bg-emerald-500", dot: "#10b981", label: "Low" };
};

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────
function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.avgFill));
  return (
    <div className="flex items-end gap-1.5 h-24 w-full">
      {data.map((d) => (
        <div key={d.day} className="flex flex-col items-center flex-1 gap-1">
          <div
            className="w-full rounded-t-sm transition-all duration-700"
            style={{
              height: `${(d.avgFill / max) * 80}px`,
              background: d.avgFill > 75 ? "#b45309" : d.avgFill > 50 ? "#d97706" : "#a3a380",
            }}
          />
          <span className="text-[10px] text-stone-500 font-medium">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Simplified Map Visualization ─────────────────────────────────────────────
function MapVisualization({ bins, selectedCampus }) {
  const [hoveredBin, setHoveredBin] = useState(null);
  const filtered = selectedCampus === "All Campuses" ? bins : bins.filter((b) => b.campus === selectedCampus);

  // Normalize lat/lng to SVG space
  const lats = filtered.map((b) => b.lat);
  const lngs = filtered.map((b) => b.lng);
  const minLat = Math.min(...lats) - 0.008;
  const maxLat = Math.max(...lats) + 0.008;
  const minLng = Math.min(...lngs) - 0.012;
  const maxLng = Math.max(...lngs) + 0.012;

  const toX = (lng) => ((lng - minLng) / (maxLng - minLng)) * 760 + 20;
  const toY = (lat) => ((maxLat - lat) / (maxLat - minLat)) * 360 + 20;

  // Sort bins by fill to draw critical ones on top
  const sorted = [...filtered].sort((a, b) => a.fill - b.fill);
  const critical = filtered.filter((b) => b.fill >= 85);

  return (
    <div className="relative w-full h-full bg-[#f5f0e8] rounded-xl overflow-hidden border border-stone-200">
      {/* Map texture overlay */}
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #a8916a 1px, transparent 0)", backgroundSize: "24px 24px" }}
      />
      {/* Road-like lines */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
        {/* Simulated road network */}
        <g stroke="#d6c9b0" strokeWidth="2" fill="none" opacity="0.6">
          <path d="M 0 200 Q 200 180 400 200 Q 600 220 800 200" />
          <path d="M 400 0 Q 380 100 400 200 Q 420 300 400 400" />
          <path d="M 0 300 Q 300 280 600 300 Q 700 305 800 300" />
          <path d="M 200 0 Q 195 200 200 400" />
          <path d="M 600 0 Q 605 200 600 400" />
        </g>
        {/* Route line between critical bins */}
        {critical.length > 1 && (
          <polyline
            points={critical.map((b) => `${toX(b.lng)},${toY(b.lat)}`).join(" ")}
            stroke="#b45309"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            fill="none"
            opacity="0.8"
          />
        )}
        {/* Bin markers */}
        {sorted.map((bin) => {
          const c = getFillColor(bin.fill);
          const x = toX(bin.lng);
          const y = toY(bin.lat);
          const isHovered = hoveredBin?.id === bin.id;
          return (
            <g
              key={bin.id}
              transform={`translate(${x},${y})`}
              onMouseEnter={() => setHoveredBin(bin)}
              onMouseLeave={() => setHoveredBin(null)}
              className="cursor-pointer"
            >
              {/* Pulse ring for critical */}
              {bin.fill >= 85 && (
                <circle r={isHovered ? 20 : 16} fill={c.dot} opacity="0.15">
                  <animate attributeName="r" values="12;20;12" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0.05;0.3" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                r={isHovered ? 10 : 8}
                fill={c.dot}
                stroke="white"
                strokeWidth="2"
                style={{ transition: "r 0.15s ease" }}
              />
              <text textAnchor="middle" dy="4" fontSize="8" fill="white" fontWeight="bold" pointerEvents="none">
                {bin.fill}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Hovered bin tooltip */}
      {hoveredBin && (
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-stone-200 pointer-events-none">
          <p className="font-semibold text-stone-800 text-sm">{hoveredBin.location}</p>
          <p className="text-xs text-stone-500">{hoveredBin.campus}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-1.5 w-16 bg-stone-200 rounded-full overflow-hidden">
              <div className={`h-full ${getFillColor(hoveredBin.fill).bar} rounded-full`} style={{ width: `${hoveredBin.fill}%` }} />
            </div>
            <span className={`text-xs font-bold ${getFillColor(hoveredBin.fill).text}`}>{hoveredBin.fill}%</span>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">Last pickup: {hoveredBin.lastPickup}</p>
        </div>
      )}
      {/* Legend */}
      <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-stone-200 text-xs space-y-1">
        {[{ label: "Critical (85%+)", color: "#ef4444" }, { label: "High (60–84%)", color: "#f59e0b" }, { label: "Medium (35–59%)", color: "#eab308" }, { label: "Low (<35%)", color: "#10b981" }].map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-stone-600">{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1 border-t border-stone-200">
          <div className="w-5 border-t-2 border-dashed border-amber-700" />
          <span className="text-stone-600">Pickup route</span>
        </div>
      </div>
      {/* Campus label */}
      <div className="absolute top-3 right-3 bg-stone-800/80 text-white text-xs px-2 py-1 rounded-md font-medium">
        {selectedCampus === "All Campuses" ? `${filtered.length} bins tracked` : selectedCampus}
      </div>
    </div>
  );
}

// ─── Pages ────────────────────────────────────────────────────────────────────
function HomePage({ setPage }) {
  const criticalCount = MOCK_BINS.filter((b) => b.fill >= 85).length;
  const avgFill = Math.round(MOCK_BINS.reduce((a, b) => a + b.fill, 0) / MOCK_BINS.length);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-stone-800 to-stone-600 p-8 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "28px 28px" }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-3xl">♻️</span>
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">EcoHack 2025</span>
          </div>
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "'Georgia', serif" }}>
            Smart Waste<br />Route Optimizer
          </h1>
          <p className="text-stone-300 max-w-lg text-sm leading-relaxed">
            Real-time trash bin monitoring and optimized pickup routing across Boston university campuses. Reducing emissions, saving time.
          </p>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setPage("dashboard")}
              className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors">
              View Dashboard →
            </button>
            <button onClick={() => setPage("routes")}
              className="bg-white/15 hover:bg-white/25 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors">
              Plan Routes
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Bins Tracked", value: MOCK_BINS.length, icon: "🗑️", sub: "across 5 campuses" },
          { label: "Need Pickup", value: criticalCount, icon: "🚨", sub: "critical right now", accent: true },
          { label: "Avg Fill Level", value: `${avgFill}%`, icon: "📊", sub: "all campuses" },
          { label: "CO₂ Saved", value: "142kg", icon: "🌿", sub: "this week" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 border ${s.accent ? "bg-red-50 border-red-200" : "bg-white border-stone-200"}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className={`text-2xl font-bold ${s.accent ? "text-red-700" : "text-stone-800"}`}>{s.value}</div>
            <div className="text-xs font-medium text-stone-700">{s.label}</div>
            <div className="text-xs text-stone-400">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick map preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>Live Bin Status</h2>
          <button onClick={() => setPage("dashboard")} className="text-amber-700 text-sm hover:underline">View full map →</button>
        </div>
        <div className="h-72 rounded-xl overflow-hidden">
          <MapVisualization bins={MOCK_BINS} selectedCampus="All Campuses" />
        </div>
      </div>

      {/* Weekly chart */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h2 className="font-semibold text-stone-800 mb-4" style={{ fontFamily: "'Georgia', serif" }}>Weekly Collection Activity</h2>
        <BarChart data={WEEKLY_DATA} />
        <div className="flex gap-4 mt-3 text-xs text-stone-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-600 inline-block" />High fill days</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-stone-400 inline-block" />Normal</span>
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const [campus, setCampus] = useState("All Campuses");
  const filtered = campus === "All Campuses" ? MOCK_BINS : MOCK_BINS.filter((b) => b.campus === campus);
  const sorted = [...filtered].sort((a, b) => b.fill - a.fill);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>Bin Dashboard</h1>
        <select
          value={campus}
          onChange={(e) => setCampus(e.target.value)}
          className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          {CAMPUSES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="h-96 rounded-xl overflow-hidden">
        <MapVisualization bins={MOCK_BINS} selectedCampus={campus} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sorted.map((bin) => {
          const c = getFillColor(bin.fill);
          return (
            <div key={bin.id} className={`flex items-center gap-4 p-4 rounded-xl border ${c.bg} border-opacity-50`}
              style={{ borderColor: c.dot + "40" }}>
              <div className="text-2xl">🗑️</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-stone-800 text-sm truncate">{bin.location}</p>
                  <span className={`text-xs font-bold ${c.text} ml-2`}>{c.label}</span>
                </div>
                <p className="text-xs text-stone-500 mb-1.5">{bin.campus} · Last: {bin.lastPickup}</p>
                <div className="h-1.5 w-full bg-white/60 rounded-full overflow-hidden">
                  <div className={`h-full ${c.bar} rounded-full transition-all duration-700`} style={{ width: `${bin.fill}%` }} />
                </div>
              </div>
              <div className={`text-lg font-bold ${c.text} w-10 text-right`}>{bin.fill}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoutesPage() {
  const [optimized, setOptimized] = useState(false);
  const critical = MOCK_BINS.filter((b) => b.fill >= 60).sort((a, b) => b.fill - a.fill);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>Route Optimizer</h1>
        <button
          onClick={() => setOptimized(!optimized)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${optimized ? "bg-emerald-600 text-white" : "bg-amber-600 text-white hover:bg-amber-500"}`}
        >
          {optimized ? "✓ Route Optimized" : "⚡ Optimize Now"}
        </button>
      </div>

      {optimized && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-emerald-800 font-semibold text-sm">✓ Route calculated — {critical.length} stops, ~4.2km total distance</p>
          <p className="text-emerald-600 text-xs mt-0.5">Estimated time: 38 min · CO₂ saved vs unoptimized: 0.8kg</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h2 className="font-semibold text-stone-700 mb-4 text-sm uppercase tracking-wider">
          {optimized ? "Optimized Pickup Order" : "Bins Needing Pickup"} ({critical.length})
        </h2>
        <div className="space-y-2">
          {critical.map((bin, i) => {
            const c = getFillColor(bin.fill);
            return (
              <div key={bin.id} className="flex items-center gap-3 py-2.5 border-b border-stone-100 last:border-0">
                <div className={`w-7 h-7 rounded-full ${c.bar} text-white text-xs flex items-center justify-center font-bold flex-shrink-0`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-800">{bin.location}</p>
                  <p className="text-xs text-stone-400">{bin.campus}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${c.text}`}>{bin.fill}%</p>
                  <p className="text-xs text-stone-400">{bin.lastPickup}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{ label: "Total Stops", value: critical.length }, { label: "Est. Distance", value: "4.2 km" }, { label: "Est. Duration", value: "38 min" }].map((s) => (
          <div key={s.label} className="bg-stone-50 rounded-xl p-4 text-center border border-stone-200">
            <div className="text-xl font-bold text-stone-800">{s.value}</div>
            <div className="text-xs text-stone-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-700 mb-4 text-sm">Weekly Avg Fill Levels</h2>
          <BarChart data={WEEKLY_DATA} />
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-700 mb-3 text-sm">Fill Level by Campus</h2>
          <div className="space-y-3">
            {["BU Charles River", "BU Medical", "BU Fenway", "Northeastern", "MIT"].map((campus) => {
              const bins = MOCK_BINS.filter((b) => b.campus === campus);
              const avg = bins.length ? Math.round(bins.reduce((a, b) => a + b.fill, 0) / bins.length) : 0;
              const c = getFillColor(avg);
              return (
                <div key={campus}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-stone-600">{campus}</span>
                    <span className={`font-bold ${c.text}`}>{avg}%</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className={`h-full ${c.bar} rounded-full transition-all duration-700`} style={{ width: `${avg}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h2 className="font-semibold text-stone-700 mb-4 text-sm">Status Distribution (All Bins)</h2>
        <div className="grid grid-cols-4 gap-4">
          {["Critical", "High", "Medium", "Low"].map((label) => {
            const thresholds = { Critical: [85, 100], High: [60, 85], Medium: [35, 60], Low: [0, 35] };
            const [lo, hi] = thresholds[label];
            const count = MOCK_BINS.filter((b) => b.fill >= lo && b.fill < hi).length;
            const colors = { Critical: "bg-red-500", High: "bg-amber-500", Medium: "bg-yellow-400", Low: "bg-emerald-500" };
            const texts = { Critical: "text-red-700", High: "text-amber-700", Medium: "text-yellow-700", Low: "text-emerald-700" };
            return (
              <div key={label} className="text-center">
                <div className={`text-3xl font-bold ${texts[label]}`}>{count}</div>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <div className={`w-2 h-2 rounded-full ${colors[label]}`} />
                  <span className="text-xs text-stone-500">{label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ContactPage() {
  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>Contact & Team</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { name: "Team Member 1", role: "Frontend / UI", emoji: "💻" },
          { name: "Team Member 2", role: "Backend / DB", emoji: "🗄️" },
          { name: "Team Member 3", role: "Route Algorithm", emoji: "🗺️" },
          { name: "Team Member 4", role: "ML / AI", emoji: "🤖" },
        ].map((m) => (
          <div key={m.name} className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-xl">{m.emoji}</div>
            <div>
              <p className="font-semibold text-stone-800 text-sm">{m.name}</p>
              <p className="text-xs text-stone-500">{m.role}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h2 className="font-semibold text-stone-700 mb-4 text-sm">Send a Message</h2>
        <div className="space-y-3">
          <input type="text" placeholder="Your name" className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-stone-50" />
          <input type="email" placeholder="Email address" className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-stone-50" />
          <textarea placeholder="Your message..." rows={4} className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-stone-50 resize-none" />
          <button className="w-full bg-amber-700 hover:bg-amber-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>About EcoRoute</h1>
      <div className="bg-gradient-to-br from-stone-700 to-stone-500 rounded-2xl p-6 text-white">
        <p className="text-stone-200 leading-relaxed text-sm">
          EcoRoute is a smart waste management platform built at EcoHack 2025. We use real-time IoT sensor data from trash bins across Boston university campuses to compute the most efficient pickup routes — minimizing fuel usage, reducing emissions, and keeping campuses clean.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: "📡", title: "Real-time Monitoring", desc: "Live fill-level data from bins across 5 campuses" },
          { icon: "🛣️", title: "Route Optimization", desc: "Algorithm-driven paths that cut distance and time" },
          { icon: "🌿", title: "Eco Impact", desc: "Tracking CO₂ saved through smarter logistics" },
        ].map((f) => (
          <div key={f.title} className="bg-white rounded-xl border border-stone-200 p-4 text-center">
            <div className="text-3xl mb-2">{f.icon}</div>
            <p className="font-semibold text-stone-800 text-sm">{f.title}</p>
            <p className="text-xs text-stone-500 mt-1">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "dashboard", label: "Dashboard", icon: "🗺️" },
  { id: "routes", label: "Routes", icon: "🛣️" },
  { id: "analytics", label: "Analytics", icon: "📊" },
  { id: "about", label: "About", icon: "ℹ️" },
  { id: "contact", label: "Contact", icon: "✉️" },
];

export default function App() {
  const [page, setPage] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderPage = () => {
    switch (page) {
      case "home": return <HomePage setPage={setPage} />;
      case "dashboard": return <DashboardPage />;
      case "routes": return <RoutesPage />;
      case "analytics": return <AnalyticsPage />;
      case "about": return <AboutPage />;
      case "contact": return <ContactPage />;
      default: return <HomePage setPage={setPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f3ec]" style={{ fontFamily: "'system-ui', sans-serif" }}>
      {/* Top nav */}
      <header className="sticky top-0 z-50 bg-[#f7f3ec]/90 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => setPage("home")} className="flex items-center gap-2">
            <span className="text-xl">♻️</span>
            <span className="font-bold text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>EcoRoute</span>
          </button>
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  page === item.id
                    ? "bg-amber-700 text-white"
                    : "text-stone-600 hover:bg-stone-200 hover:text-stone-800"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
          {/* AI chip — reserved */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-stone-800 text-white text-xs px-3 py-1.5 rounded-full opacity-60">
              <span>🤖</span>
              <span>AI Assistant</span>
              <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">SOON</span>
            </div>
          </div>
          {/* Mobile burger */}
          <button className="md:hidden p-2 text-stone-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-stone-200 bg-[#f7f3ec] px-4 py-2 space-y-1">
            {NAV_ITEMS.map((item) => (
              <button key={item.id} onClick={() => { setPage(item.id); setMobileMenuOpen(false); }}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${page === item.id ? "bg-amber-700 text-white" : "text-stone-700 hover:bg-stone-200"}`}>
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-4 py-6">{renderPage()}</main>

      {/* Footer */}
      <footer className="border-t border-stone-200 mt-12 py-6 text-center text-xs text-stone-400">
        Built with 💚 at EcoHack 2025 · BU, Northeastern, MIT campuses
      </footer>
    </div>
  );
}
