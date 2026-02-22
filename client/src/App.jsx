import { useState } from "react";
import MapPage       from "./pages/MapPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import HomePage      from "./pages/HomePage";

// ─── Stub pages (not yet replaced) ───────────────────────────────────────────

function RoutesPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>Route Optimizer</h1>
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400">
        <div className="text-4xl mb-3">🛣️</div>
        <p className="font-medium">Route optimization coming soon</p>
        <p className="text-sm mt-1">Use the Map → Hotspot Analysis to see collection urgency by bin</p>
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
          EcoRoute is a smart waste management platform built at EcoHack 2025. We use real-time sensor data from Big Belly bins across BU's three campuses to monitor fill levels, identify hotspots, suggest new bin placements, and help collectors prioritize pickups — minimizing fuel usage, reducing emissions, and keeping campuses clean.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: "📡", title: "Real-time Monitoring", desc: "Live fill-level data from 84 Big Belly bins across 3 BU campuses" },
          { icon: "🔥", title: "Hotspot Analysis",     desc: "Algorithm-driven placement scoring and coverage gap detection"   },
          { icon: "🌿", title: "Smarter Pickups",      desc: "Collection timing estimates to help trash and recycle collectors" },
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

function ContactPage() {
  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>Contact & Team</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { name: "Team Member 1", role: "Frontend / UI",   emoji: "💻" },
          { name: "Team Member 2", role: "Backend / DB",    emoji: "🗄️" },
          { name: "Team Member 3", role: "Data / Analytics",emoji: "📊" },
          { name: "Team Member 4", role: "ML / AI",         emoji: "🤖" },
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
          <input type="text"  placeholder="Your name"    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-stone-50" />
          <input type="email" placeholder="Email address" className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-stone-50" />
          <textarea placeholder="Your message..." rows={4} className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-stone-50 resize-none" />
          <button className="w-full bg-amber-700 hover:bg-amber-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">Send Message</button>
        </div>
      </div>
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

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
  const [page,           setPage]           = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderPage = () => {
    switch (page) {
      case "home":      return <HomePage      setPage={setPage} />;
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
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
          <button onClick={() => setPage("home")} className="flex items-center gap-2">
            <span className="text-xl">♻️</span>
            <span className="font-bold text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>EcoRoute</span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <button key={item.id} onClick={() => setPage(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  page === item.id ? "bg-amber-700 text-white" : "text-stone-600 hover:bg-stone-200 hover:text-stone-800"
                }`}>
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          {/* Mobile burger */}
          <button className="md:hidden p-2 text-stone-600 text-lg" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-stone-200 bg-[#f7f3ec] px-4 py-2 space-y-1">
            {NAV_ITEMS.map((item) => (
              <button key={item.id}
                onClick={() => { setPage(item.id); setMobileMenuOpen(false); }}
                className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  page === item.id ? "bg-amber-700 text-white" : "text-stone-700 hover:bg-stone-200"
                }`}>
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {renderPage()}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 mt-12 py-6 text-center text-xs text-stone-400">
        Built with 💚 at EcoHack 2025 · BU Charles River, Medical & Fenway campuses
      </footer>
    </div>
  );
}

