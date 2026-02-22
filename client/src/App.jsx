import { useState } from "react";
import MapPage from "./pages/MapPage";

// ─── Mock Data for Home/Dashboard/Routes/Analytics ───────────────────────────

const WEEKLY_DATA = [
  { day: "Mon", collections: 14, avgFill: 68 },
  { day: "Tue", collections: 18, avgFill: 74 },
  { day: "Wed", collections: 12, avgFill: 55 },
  { day: "Thu", collections: 20, avgFill: 82 },
  { day: "Fri", collections: 22, avgFill: 89 },
  { day: "Sat", collections: 9,  avgFill: 43 },
  { day: "Sun", collections: 6,  avgFill: 31 },
];

const MOCK_BINS = [
  { id: 1,  campus: "BU Charles River", location: "GSU Plaza",       fill: 92, lastPickup: "2h ago" },
  { id: 2,  campus: "BU Charles River", location: "Marsh Plaza",      fill: 45, lastPickup: "5h ago" },
  { id: 3,  campus: "BU Charles River", location: "CAS Building",     fill: 78, lastPickup: "3h ago" },
  { id: 4,  campus: "BU Charles River", location: "Agganis Arena",    fill: 31, lastPickup: "1h ago" },
  { id: 5,  campus: "BU Charles River", location: "Questrom School",  fill: 67, lastPickup: "4h ago" },
  { id: 6,  campus: "BU Medical",       location: "L-Building",       fill: 88, lastPickup: "6h ago" },
  { id: 7,  campus: "BU Medical",       location: "BUSM Courtyard",   fill: 55, lastPickup: "3h ago" },
  { id: 8,  campus: "BU Fenway",        location: "Fenway Main",      fill: 72, lastPickup: "2h ago" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getFillColor = (fill) => {
  if (fill >= 85) return { bg: "bg-red-100",     text: "text-red-700",    bar: "bg-red-500",    dot: "#ef4444", label: "Critical" };
  if (fill >= 60) return { bg: "bg-amber-100",   text: "text-amber-700",  bar: "bg-amber-500",  dot: "#f59e0b", label: "High"     };
  if (fill >= 35) return { bg: "bg-yellow-100",  text: "text-yellow-700", bar: "bg-yellow-400", dot: "#eab308", label: "Medium"   };
  return                 { bg: "bg-emerald-100", text: "text-emerald-700",bar: "bg-emerald-500",dot: "#10b981", label: "Low"      };
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

// ─── Pages ───────────────────────────────────────────────────────────────────

function HomePage({ setPage }) {
  const criticalCount = MOCK_BINS.filter((b) => b.fill >= 85).length;
  const avgFill = Math.round(MOCK_BINS.reduce((a, b) => a + b.fill, 0) / MOCK_BINS.length);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-stone-800 to-stone-600 p-8 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-3xl">♻️</span>
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">EcoHack 2025</span>
          </div>
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "'Georgia', serif" }}>
            Smart Waste<br />Route Optimizer
          </h1>
          <p className="text-stone-300 max-w-lg text-sm leading-relaxed">
            Real-time trash bin monitoring and optimized pickup routing across Boston university campuses.
          </p>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setPage("map")}
              className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors">
              View Map →
            </button>
            <button onClick={() => setPage("routes")}
              className="bg-white/15 hover:bg-white/25 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors">
              Plan Routes
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Bins Tracked", value: MOCK_BINS.length, icon: "🗑️", sub: "across 3 campuses" },
          { label: "Need Pickup",  value: criticalCount,    icon: "🚨", sub: "critical right now", accent: true },
          { label: "Avg Fill",     value: `${avgFill}%`,    icon: "📊", sub: "all campuses" },
          { label: "CO₂ Saved",    value: "142kg",          icon: "🌿", sub: "this week" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 border ${s.accent ? "bg-red-50 border-red-200" : "bg-white border-stone-200"}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className={`text-2xl font-bold ${s.accent ? "text-red-700" : "text-stone-800"}`}>{s.value}</div>
            <div className="text-xs font-medium text-stone-700">{s.label}</div>
            <div className="text-xs text-stone-400">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>Weekly Collection Activity</h2>
          <button onClick={() => setPage("map")} className="text-amber-700 text-sm hover:underline">View map →</button>
        </div>
        <BarChart data={WEEKLY_DATA} />
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
          <p className="text-emerald-800 font-semibold text-sm">✓ Route calculated — {critical.length} stops, ~4.2km total</p>
          <p className="text-emerald-600 text-xs mt-0.5">Est. time: 38 min · CO₂ saved vs unoptimized: 0.8kg</p>
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
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h2 className="font-semibold text-stone-700 mb-4 text-sm">Weekly Avg Fill Levels</h2>
        <BarChart data={WEEKLY_DATA} />
      </div>
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h2 className="font-semibold text-stone-700 mb-3 text-sm">Fill Level by Campus</h2>
        <div className="space-y-3">
          {["BU Charles River", "BU Medical", "BU Fenway"].map((campus) => {
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
                  <div className={`h-full ${c.bar} rounded-full`} style={{ width: `${avg}%` }} />
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
          { name: "Team Member 1", role: "Frontend / UI",    emoji: "💻" },
          { name: "Team Member 2", role: "Backend / DB",     emoji: "🗄️" },
          { name: "Team Member 3", role: "Route Algorithm",  emoji: "🗺️" },
          { name: "Team Member 4", role: "ML / AI",          emoji: "🤖" },
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
          <button className="w-full bg-amber-700 hover:bg-amber-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">Send Message</button>
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
          EcoRoute is a smart waste management platform built at EcoHack 2025. We use real-time data from belly bins across BU campuses to compute the most efficient pickup routes — minimizing fuel usage, reducing emissions, and keeping campuses clean.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: "📡", title: "Real-time Monitoring", desc: "Live fill-level data from bins across 3 BU campuses" },
          { icon: "🛣️", title: "Route Optimization",  desc: "Algorithm-driven paths that cut distance and time"  },
          { icon: "🌿", title: "Eco Impact",           desc: "Tracking CO₂ saved through smarter logistics"       },
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

// ─── Nav ─────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "home",      label: "Home",      icon: "🏠" },
  { id: "map",       label: "Map",       icon: "🗺️" },
  { id: "routes",    label: "Routes",    icon: "🛣️" },
  { id: "analytics", label: "Analytics", icon: "📊" },
  { id: "about",     label: "About",     icon: "ℹ️" },
  { id: "contact",   label: "Contact",   icon: "✉️" },
];

// ─── App Shell ────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderPage = () => {
    switch (page) {
      case "home":      return <HomePage setPage={setPage} />;
      case "map":       return <MapPage />;
      case "routes":    return <RoutesPage />;
      case "analytics": return <AnalyticsPage />;
      case "about":     return <AboutPage />;
      case "contact":   return <ContactPage />;
      default:          return <HomePage setPage={setPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f3ec]" style={{ fontFamily: "'system-ui', sans-serif" }}>
      {/* Navbar */}
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
                  page === item.id ? "bg-amber-700 text-white" : "text-stone-600 hover:bg-stone-200 hover:text-stone-800"
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
              <button key={item.id}
                onClick={() => { setPage(item.id); setMobileMenuOpen(false); }}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  page === item.id ? "bg-amber-700 text-white" : "text-stone-700 hover:bg-stone-200"
                }`}>
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
        Built with 💚 at EcoHack 2025 · BU Charles River, Medical & Fenway campuses
      </footer>
    </div>
  );
}