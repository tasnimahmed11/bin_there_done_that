import { useState, useEffect, useRef } from "react";
import Map, { Marker, Popup, NavigationControl, FullscreenControl } from "react-map-gl";

const API = "http://localhost:3001";

// ── CSV Export utility ────────────────────────────────────────────────────────
function exportPickupCSV(hotspots, stream, campus) {
  const daysKey = stream === "trash" ? "waste_days_to_80"   : "recycle_days_to_80";
  const fillKey = stream === "trash" ? "waste_fill_percent" : "recycle_fill_percent";
  const avgKey  = stream === "trash" ? "waste_days_to_fill" : "recycle_days_to_fill";
  const label   = stream === "trash" ? "Trash" : "Recycle";
  const urgency = (d) => d == null ? "No data" : d <= 2 ? "URGENT" : d <= 5 ? "Soon" : "On schedule";

  const rows = [...hotspots]
    .filter(h => h[daysKey] != null)
    .sort((a, b) => (a[daysKey] ?? 999) - (b[daysKey] ?? 999));

  const headers = ["Priority", "Location", "Campus", `Days Until 80% Full`, `Avg Fill %`, `Avg Days to Fill`, "Urgency", "Hotspot Score", "Placement"];
  const csvRows = rows.map((h, i) => [
    i + 1,
    `"${(h.description || "").replace(/"/g, '""')}"`,
    h.campus || "",
    h[daysKey]?.toFixed(2) ?? "",
    h[fillKey]?.toFixed(1) ?? "",
    h[avgKey]?.toFixed(2)  ?? "",
    urgency(h[daysKey]),
    h.hotspot_score ?? "",
    h.placement_status ?? "",
  ]);

  const csv  = [headers.join(","), ...csvRows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `bu_${campus}_${label.toLowerCase()}_pickup_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const CAMPUS_META = {
  "charles-river": { label: "Charles River", lat: 42.3505, lng: -71.1054, zoom: 15, color: "#b45309" },
  "medical":        { label: "Medical",       lat: 42.3358, lng: -71.0720, zoom: 16, color: "#7c3aed" },
  "fenway":         { label: "Fenway",        lat: 42.3453, lng: -71.0994, zoom: 16, color: "#0f766e" },
};

const getFillMeta = (pct) => {
  if (pct >= 85) return { color: "#dc2626", label: "Critical" };
  if (pct >= 65) return { color: "#d97706", label: "High"     };
  if (pct >= 40) return { color: "#ca8a04", label: "Medium"   };
  return               { color: "#16a34a", label: "Low"      };
};

const HOTSPOT_META = {
  hot:       { color: "#dc2626", bg: "#fee2e2", label: "Overwhelmed",    desc: "Existing bin — fills very fast, high demand"    },
  good:      { color: "#16a34a", bg: "#dcfce7", label: "Well placed",    desc: "Existing bin — healthy utilization"             },
  cold:      { color: "#6b7280", bg: "#f3f4f6", label: "Underused",      desc: "Existing bin — low demand, consider relocating" },
  suggested: { color: "#2563eb", bg: "#dbeafe", label: "Suggested",      desc: "No bin here yet — high foot traffic area"       },
};

const getDaysColor = (days) => {
  if (days == null) return "#9ca3af";
  if (days <= 2)    return "#dc2626";
  if (days <= 5)    return "#d97706";
  return "#16a34a";
};
const getDaysLabel = (days) => {
  if (days == null) return "N/A";
  if (days <= 2)    return "Urgent";
  if (days <= 5)    return "Soon";
  return "OK";
};

// ── High-traffic anchor points per campus ─────────────────────────────────────
// These are real BU locations with known high foot traffic.
// Blue pins are generated here if no existing bin is within SUGGEST_RADIUS meters.
const HIGH_TRAFFIC_ZONES = {
  "charles-river": [
    // West Campus dorms
    { name: "Rich Hall",              lat: 42.35224, lng: -71.11983, reason: "West Campus dorm" },
    { name: "Claflin Hall",           lat: 42.35261, lng: -71.11820, reason: "West Campus dorm" },
    { name: "Sleeper Hall",           lat: 42.35243, lng: -71.11700, reason: "West Campus dorm" },
    // Student Village
    { name: "Student Village 1",      lat: 42.35298, lng: -71.11015, reason: "Large dorm complex" },
    { name: "Student Village 2",      lat: 42.35380, lng: -71.10880, reason: "Large dorm complex" },
    // Central dorms
    { name: "Warren Towers",          lat: 42.34882, lng: -71.09948, reason: "Largest BU dorm" },
    { name: "Danielsen Hall (Towers)",lat: 42.34770, lng: -71.09800, reason: "High-rise dorm" },
    // T Stations
    { name: "Blandford St T",         lat: 42.35081, lng: -71.11386, reason: "Green Line B stop" },
    { name: "BU East T Station",      lat: 42.34950, lng: -71.09829, reason: "Green Line B stop" },
    { name: "BU Central T Station",   lat: 42.35023, lng: -71.10541, reason: "Green Line B stop" },
    { name: "BU West / Amory T",      lat: 42.35108, lng: -71.11628, reason: "Green Line B stop" },
    // Academic / high foot traffic buildings
    { name: "CGS Building",           lat: 42.35018, lng: -71.10417, reason: "College of General Studies" },
    { name: "GSU / Mugar Library",    lat: 42.35042, lng: -71.10530, reason: "Student Union + Library hub" },
    { name: "Bay State Rd near Hillel",lat: 42.35030, lng: -71.10150, reason: "High pedestrian corridor" },
    { name: "Behind CDS Building",    lat: 42.34975, lng: -71.10310, reason: "Rear access high foot traffic" },
    { name: "Marsh Plaza",            lat: 42.34960, lng: -71.10030, reason: "Central campus gathering area" },
    { name: "FitRec Center",          lat: 42.35196, lng: -71.11508, reason: "Campus gym — high daily traffic" },
    { name: "Agganis Arena Entrance", lat: 42.35284, lng: -71.11332, reason: "Arena main entrance" },
    { name: "Questrom School",        lat: 42.34914, lng: -71.09758, reason: "Business school entrance" },
  ],
  "medical": [
    { name: "Boston Medical Center Main", lat: 42.33560, lng: -71.07150, reason: "BMC main entrance" },
    { name: "BUSM Courtyard",             lat: 42.33620, lng: -71.07310, reason: "Med school courtyard" },
    { name: "Albany St Crosswalk Hub",    lat: 42.33520, lng: -71.07100, reason: "Pedestrian crossing hub" },
    { name: "Instructional Building",     lat: 42.33500, lng: -71.07080, reason: "Main lecture building" },
  ],
  "fenway": [
    { name: "Sargent College Entrance",  lat: 42.34610, lng: -71.10100, reason: "Sargent front entrance" },
    { name: "SHA Building Front",        lat: 42.34470, lng: -71.09800, reason: "School of Hospitality" },
    { name: "Fenway Campus Main Entry",  lat: 42.34530, lng: -71.09940, reason: "Main campus entry point" },
    { name: "Riverway Park Edge",        lat: 42.34310, lng: -71.10560, reason: "Park pedestrian path" },
  ],
};

// ── Haversine distance in meters ──────────────────────────────────────────────
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const SUGGEST_RADIUS = 80; // meters — if no bin within this distance, suggest one

// Returns blue suggested-placement pins for a campus given existing bins
function computeSuggestedPins(campus, existingBins) {
  const zones = HIGH_TRAFFIC_ZONES[campus] || [];
  return zones
    .filter(zone => {
      const closest = existingBins.reduce((min, bin) => {
        const d = distanceMeters(zone.lat, zone.lng, bin.lat, bin.lng);
        return d < min ? d : min;
      }, Infinity);
      return closest > SUGGEST_RADIUS;
    })
    .map((zone, i) => ({ ...zone, id: `suggested-${i}`, placement_status: "suggested" }));
}

// ── Pins ──────────────────────────────────────────────────────────────────────
function BinPin({ bin, binType, isSelected }) {
  const val = binType === "recycle" ? bin.recycle_fill : bin.trash_fill;
  const { color } = getFillMeta(val);
  return (
    <div className="cursor-pointer flex flex-col items-center select-none" style={{ transform: "translate(-50%,-100%)" }}>
      {val >= 85 && (
        <div className="absolute rounded-full animate-ping"
          style={{ width: 30, height: 30, backgroundColor: color, opacity: 0.2, top: -3, left: "50%", transform: "translateX(-50%)" }} />
      )}
      <div className="flex items-center justify-center rounded-full text-white font-bold shadow-lg border-2 border-white"
        style={{ width: isSelected ? 40 : 30, height: isSelected ? 40 : 30, backgroundColor: color, fontSize: isSelected ? 10 : 8, transition: "all 0.15s" }}>
        {binType === "recycle" ? "♻" : "🗑"}<span className="ml-0.5">{val}%</span>
      </div>
      <div style={{ width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: `7px solid ${color}`, marginTop: -1 }} />
    </div>
  );
}

function HotspotPin({ bin, hotspotView, isSelected }) {
  let displayValue, color;
  if (bin.placement_status === "suggested") {
    displayValue = "+"; color = "#2563eb";
  } else if (hotspotView === "score") {
    const meta = HOTSPOT_META[bin.placement_status] || HOTSPOT_META.good;
    displayValue = Math.round(bin.hotspot_score); color = meta.color;
  } else if (hotspotView === "trash") {
    const d = bin.waste_days_to_80;
    displayValue = d != null ? (d < 10 ? d.toFixed(1) : Math.round(d)) + "d" : "?";
    color = getDaysColor(d);
  } else {
    const d = bin.recycle_days_to_80;
    displayValue = d != null ? (d < 10 ? d.toFixed(1) : Math.round(d)) + "d" : "?";
    color = getDaysColor(d);
  }

  const size = isSelected ? 44 : bin.placement_status === "suggested" ? 32 : 34;
  const isSuggested = bin.placement_status === "suggested";

  return (
    <div className="cursor-pointer flex flex-col items-center select-none" style={{ transform: "translate(-50%,-100%)" }}>
      {(color === "#dc2626" || isSuggested) && (
        <div className="absolute rounded-full animate-ping"
          style={{ width: size + 8, height: size + 8, backgroundColor: color, opacity: 0.2, top: -4, left: "50%", transform: "translateX(-50%)" }} />
      )}
      <div className="flex items-center justify-center rounded-full shadow-xl font-bold"
        style={{
          width: size, height: size,
          backgroundColor: isSuggested ? "white" : color,
          color: isSuggested ? color : "white",
          fontSize: isSuggested ? 18 : isSelected ? 11 : 9,
          border: isSuggested ? `3px dashed ${color}` : "3px solid white",
          transition: "all 0.15s",
          letterSpacing: "-0.5px",
        }}>
        {displayValue}
      </div>
      <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `8px solid ${color}`, marginTop: -1 }} />
    </div>
  );
}

function CityBinPin() {
  return (
    <div style={{ transform: "translate(-50%,-50%)" }}>
      <div className="w-3 h-3 rounded-full border-2 border-white shadow" style={{ backgroundColor: "#6b7280" }} />
    </div>
  );
}

// ── Popups ────────────────────────────────────────────────────────────────────
function BinPopup({ bin, onClose }) {
  const tc = getFillMeta(bin.trash_fill);
  const rc = getFillMeta(bin.recycle_fill);
  return (
    <Popup latitude={bin.lat} longitude={bin.lng} onClose={onClose} closeButton closeOnClick={false} anchor="bottom" offset={22}>
      <div className="p-1 min-w-[200px]">
        <p className="font-bold text-stone-800 text-sm">{bin.notes || bin.address}</p>
        <p className="text-xs text-stone-400 mb-3 truncate">{bin.address}</p>
        {[{ label: "🗑️ Trash", val: bin.trash_fill, c: tc }, { label: "♻️ Recycle", val: bin.recycle_fill, c: rc }].map(s => (
          <div key={s.label} className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-stone-600 font-medium">{s.label}</span>
              <span className="font-bold" style={{ color: s.c.color }}>{s.val}% · {s.c.label}</span>
            </div>
            <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${s.val}%`, backgroundColor: s.c.color }} />
            </div>
          </div>
        ))}
      </div>
    </Popup>
  );
}

function HotspotPopup({ bin, hotspotView, onClose }) {
  const isSuggested = bin.placement_status === "suggested";
  const meta = HOTSPOT_META[bin.placement_status] || HOTSPOT_META.good;
  const trashDays   = bin.waste_days_to_80;
  const recycleDays = bin.recycle_days_to_80;

  return (
    <Popup latitude={bin.lat} longitude={bin.lng} onClose={onClose} closeButton closeOnClick={false} anchor="bottom" offset={28}>
      <div className="p-1 min-w-[220px]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color }} />
          <p className="font-bold text-stone-800 text-sm leading-tight">{bin.name || bin.description}</p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold mb-3"
          style={{ backgroundColor: meta.bg, color: meta.color, border: isSuggested ? `1.5px dashed ${meta.color}` : "none" }}>
          {meta.label}
        </div>

        {isSuggested ? (
          <div className="space-y-2">
            <p className="text-xs text-stone-600 leading-relaxed">
              <span className="font-semibold">No bin currently here.</span> This location has high foot traffic ({bin.reason}) and is more than {SUGGEST_RADIUS}m from the nearest existing bin.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 font-medium">
              💡 Recommendation: Install a belly bin unit at this location
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {hotspotView === "score" && (
              <div className="flex justify-between text-xs">
                <span className="text-stone-500">Placement score</span>
                <span className="font-bold text-stone-800">{bin.hotspot_score}/100</span>
              </div>
            )}
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider pt-1">Days Until Collection Needed</p>
            {[
              { label: "🗑️ Trash Collector",   days: trashDays   },
              { label: "♻️ Recycle Collector", days: recycleDays },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2">
                <span className="text-xs font-medium text-stone-600">{s.label}</span>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: getDaysColor(s.days) }}>
                    {s.days != null ? `${s.days.toFixed(1)}d` : "No data"}
                  </p>
                  <p className="text-[10px]" style={{ color: getDaysColor(s.days) }}>{getDaysLabel(s.days)}</p>
                </div>
              </div>
            ))}
            <div className="pt-1 border-t border-stone-100 grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-xs font-bold text-stone-700">{bin.waste_days_to_fill ? Number(bin.waste_days_to_fill).toFixed(1) : "?"} days</p>
                <p className="text-[10px] text-stone-400">avg to fill (trash)</p>
              </div>
              <div>
                <p className="text-xs font-bold text-stone-700">{bin.recycle_days_to_fill ? Number(bin.recycle_days_to_fill).toFixed(1) : "?"} days</p>
                <p className="text-[10px] text-stone-400">avg to fill (recycle)</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Popup>
  );
}

// ── Chart ─────────────────────────────────────────────────────────────────────
const SIX_MONTH = [
  { label: "Sep", trash: 58, recycle: 42 }, { label: "Oct", trash: 63, recycle: 48 },
  { label: "Nov", trash: 71, recycle: 52 }, { label: "Dec", trash: 55, recycle: 38 },
  { label: "Jan", trash: 79, recycle: 61 }, { label: "Feb", trash: 82, recycle: 67 },
];
const SEVEN_DAY = [
  { label: "Mon", trash: 72, recycle: 55 }, { label: "Tue", trash: 68, recycle: 50 },
  { label: "Wed", trash: 85, recycle: 71 }, { label: "Thu", trash: 74, recycle: 58 },
  { label: "Fri", trash: 91, recycle: 80 }, { label: "Sat", trash: 48, recycle: 32 },
  { label: "Sun", trash: 37, recycle: 24 },
];

function DualBarChart({ data, showTrash, showRecycle }) {
  return (
    <div className="flex items-end gap-2 h-32 w-full">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col items-center flex-1 gap-1">
          <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: 108 }}>
            {showTrash   && <div className="flex-1 rounded-t-md transition-all duration-700" style={{ height: `${d.trash * 1.06}px`, backgroundColor: "#b45309" }} />}
            {showRecycle && <div className="flex-1 rounded-t-md transition-all duration-700" style={{ height: `${d.recycle * 1.06}px`, backgroundColor: "#15803d" }} />}
          </div>
          <span className="text-[10px] text-stone-400 font-medium">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── AI Chat Widget ────────────────────────────────────────────────────────────
function AIChatWidget() {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: "Hi! I'm EcoRoute AI 🤖 Ask me anything about BU's bin fill levels, which campus needs pickup urgently, or request a full report!" }]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [report,   setReport]   = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim(); setInput("");
    setMessages(prev => [...prev, { role: "user", content: question }]);
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/ai/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, history: messages.slice(1) }) });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, couldn't connect to the server." }]);
    }
    setLoading(false);
  };

  const generateReport = async () => {
    setLoading(true); setReport(null);
    try {
      const res  = await fetch(`${API}/api/ai/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      setReport(data.report);
    } catch { setReport("Failed to generate report."); }
    setLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden" style={{ height: 480 }}>
          <div className="bg-stone-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <div><p className="text-white font-semibold text-sm">EcoRoute AI</p><p className="text-stone-400 text-xs">Powered by GPT-4o mini</p></div>
            </div>
            <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-white text-lg">✕</button>
          </div>
          <div className="px-3 pt-3">
            <button onClick={generateReport} disabled={loading}
              className="w-full bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
              {loading ? "Generating..." : "📊 Generate Full Campus Report"}
            </button>
          </div>
          {report && <div className="mx-3 mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-stone-700 leading-relaxed max-h-32 overflow-y-auto">{report}</div>}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${msg.role === "user" ? "bg-amber-700 text-white rounded-br-sm" : "bg-stone-100 text-stone-800 rounded-bl-sm"}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-stone-100 px-3 py-2 rounded-xl rounded-bl-sm">
                  <div className="flex gap-1">{[0,150,300].map(d => <div key={d} className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="px-3 pb-3 flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder="Ask about bin status..."
              className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 bg-stone-50" />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              className="bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-xs font-bold">→</button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(!open)}
        className="w-14 h-14 bg-stone-800 hover:bg-stone-700 text-white rounded-full shadow-xl flex items-center justify-center text-2xl transition-all hover:scale-110">
        {open ? "✕" : "🤖"}
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MapPage() {
  const [campus,      setCampus]      = useState("charles-river");
  const [binType,     setBinType]     = useState("trash");
  const [selectedBin, setSelectedBin] = useState(null);
  const [showTrash,   setShowTrash]   = useState(true);
  const [showRecycle, setShowRecycle] = useState(true);
  const [timeRange,   setTimeRange]   = useState("7days");
  const [showCity,    setShowCity]    = useState(false);
  const [showHotspot, setShowHotspot] = useState(false);
  const [hotspotView, setHotspotView] = useState("score");
  const [bins,        setBins]        = useState([]);
  const [cityBins,    setCityBins]    = useState([]);
  const [hotspots,    setHotspots]    = useState([]);
  const [stats,       setStats]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [viewState,   setViewState]   = useState({ latitude: 42.3505, longitude: -71.1054, zoom: 15 });

  useEffect(() => {
    setLoading(true); setSelectedBin(null);
    fetch(`${API}/api/bins?campus=${campus}`)
      .then(r => r.json()).then(d => { setBins(d.bins || []); setLoading(false); })
      .catch(() => { setError("Cannot connect to backend. Is the server running on port 3001?"); setLoading(false); });
  }, [campus]);

  useEffect(() => {
    fetch(`${API}/api/bins/hotspot?campus=${campus}`)
      .then(r => r.json()).then(d => setHotspots(d.hotspots || [])).catch(() => {});
  }, [campus]);

  useEffect(() => {
    fetch(`${API}/api/bins/stats`).then(r => r.json()).then(d => setStats(d.stats || [])).catch(() => {});
    fetch(`${API}/api/bins/city`).then(r => r.json()).then(d => setCityBins(d.bins || [])).catch(() => {});
  }, []);

  const switchCampus = (key) => {
    setCampus(key); setSelectedBin(null);
    setViewState({ latitude: CAMPUS_META[key].lat, longitude: CAMPUS_META[key].lng, zoom: CAMPUS_META[key].zoom });
  };

  // Compute suggested blue pins from high-traffic zones with no nearby bin
  const suggestedPins = computeSuggestedPins(campus, bins);

  // All hotspot-mode pins = existing scored bins + suggested new locations
  const allHotspotPins = [...hotspots, ...suggestedPins];

  const campusStats   = stats.find(s => s.campus === campus) || {};
  const criticalCount = bins.filter(b => b.trash_fill >= 85 || b.recycle_fill >= 85).length;
  const urgentTrash   = hotspots.filter(h => h.waste_days_to_80   != null && h.waste_days_to_80   <= 2).length;
  const urgentRecycle = hotspots.filter(h => h.recycle_days_to_80 != null && h.recycle_days_to_80 <= 2).length;
  const chartData     = timeRange === "7days" ? SEVEN_DAY : SIX_MONTH;

  const statsCards = showHotspot ? (
    hotspotView === "score" ? [
      { icon: "🔴", label: "Overwhelmed",   value: hotspots.filter(h => h.placement_status === "hot").length,  sub: "fills very fast",      accent: true },
      { icon: "🟢", label: "Well Placed",   value: hotspots.filter(h => h.placement_status === "good").length, sub: "healthy utilization" },
      { icon: "🔵", label: "Suggested New", value: suggestedPins.length,                                       sub: "gaps in coverage"    },
      { icon: "⚫", label: "Underused",     value: hotspots.filter(h => h.placement_status === "cold").length, sub: "consider relocating" },
    ] : hotspotView === "trash" ? [
      { icon: "🚨", label: "Urgent",        value: urgentTrash,                                                                                  sub: "collect ≤ 2 days",  accent: urgentTrash > 0 },
      { icon: "🟠", label: "Due Soon",      value: hotspots.filter(h => h.waste_days_to_80 > 2 && h.waste_days_to_80 <= 5).length,              sub: "collect ≤ 5 days" },
      { icon: "✅", label: "On Schedule",   value: hotspots.filter(h => h.waste_days_to_80 > 5).length,                                         sub: "> 5 days away"    },
      { icon: "🗑️", label: "Trash Bins",   value: hotspots.filter(h => h.waste_days_to_80 != null).length,                                     sub: "with timing data" },
    ] : [
      { icon: "🚨", label: "Urgent",        value: urgentRecycle,                                                                                sub: "collect ≤ 2 days",  accent: urgentRecycle > 0 },
      { icon: "🟠", label: "Due Soon",      value: hotspots.filter(h => h.recycle_days_to_80 > 2 && h.recycle_days_to_80 <= 5).length,          sub: "collect ≤ 5 days" },
      { icon: "✅", label: "On Schedule",   value: hotspots.filter(h => h.recycle_days_to_80 > 5).length,                                       sub: "> 5 days away"    },
      { icon: "♻️", label: "Recycle Bins",  value: hotspots.filter(h => h.recycle_days_to_80 != null).length,                                   sub: "with timing data" },
    ]
  ) : [
    { icon: "🗑️", label: "BU Bins",      value: loading ? "..." : bins.length,                        sub: `on ${CAMPUS_META[campus].label}` },
    { icon: "📊", label: "Avg Trash",     value: loading ? "..." : `${campusStats.avg_trash   ?? 0}%`, sub: "fill level" },
    { icon: "♻️", label: "Avg Recycle",   value: loading ? "..." : `${campusStats.avg_recycle  ?? 0}%`, sub: "fill level" },
    { icon: "🚨", label: "Critical",      value: loading ? "..." : criticalCount,                       sub: "need pickup", accent: criticalCount > 0 },
  ];

  const sortedHotspots = [...hotspots].sort((a, b) => {
    if (hotspotView === "trash")   return (a.waste_days_to_80   ?? 999) - (b.waste_days_to_80   ?? 999);
    if (hotspotView === "recycle") return (a.recycle_days_to_80 ?? 999) - (b.recycle_days_to_80 ?? 999);
    return b.hotspot_score - a.hotspot_score;
  });

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>Campus Bin Map</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            {showHotspot
              ? hotspotView === "score"   ? "Hotspot mode — existing bins scored + suggested new locations in blue"
              : hotspotView === "trash"   ? "Trash collector view — days until each bin needs pickup"
              :                            "Recycle collector view — days until each bin needs pickup"
              : "Click a pin to see fill data · Real BU Big Belly sensor data"}
          </p>
        </div>
        {showHotspot && hotspotView === "score" && suggestedPins.length > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 self-start">
            <span className="text-lg">🔵</span>
            <div><p className="text-blue-700 font-semibold text-sm">{suggestedPins.length} gaps found</p><p className="text-blue-400 text-xs">High-traffic areas with no bin</p></div>
          </div>
        )}
        {!showHotspot && criticalCount > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2 self-start">
            <span className="text-lg">🚨</span>
            <div><p className="text-red-700 font-semibold text-sm">{criticalCount} critical bins</p><p className="text-red-400 text-xs">Needs pickup soon</p></div>
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">⚠️ {error}</div>}

      {/* Campus Toggle */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(CAMPUS_META).map(([key, m]) => (
          <button key={key} onClick={() => switchCampus(key)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all"
            style={campus === key ? { backgroundColor: m.color, borderColor: m.color, color: "white" } : { backgroundColor: "white", borderColor: "#e7e5e4", color: "#57534e" }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: campus === key ? "white" : m.color }} />
            BU {m.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => { setShowHotspot(!showHotspot); setSelectedBin(null); setHotspotView("score"); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all ${
            showHotspot ? "text-white border-transparent" : "bg-white text-stone-600 border-stone-300 hover:border-stone-400"
          }`}
          style={showHotspot ? { background: "linear-gradient(135deg,#dc2626,#b45309)", borderColor: "transparent" } : {}}>
          🔥 {showHotspot ? "Hotspot Mode ON" : "Hotspot Analysis"}
        </button>

        {showHotspot && (
          <div className="flex bg-stone-100 rounded-xl p-1 gap-1">
            {[
              { val: "score",   label: "📊 Placement" },
              { val: "trash",   label: "🗑️ Trash Pickup" },
              { val: "recycle", label: "♻️ Recycle Pickup" },
            ].map(opt => (
              <button key={opt.val} onClick={() => { setHotspotView(opt.val); setSelectedBin(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  hotspotView === opt.val ? "bg-white shadow text-stone-800" : "text-stone-500 hover:text-stone-700"
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {!showHotspot && (
          <>
            <div className="flex bg-stone-100 rounded-xl p-1 gap-1">
              {[{ val: "trash", label: "🗑️ Trash" }, { val: "recycle", label: "♻️ Recycle" }].map(opt => (
                <button key={opt.val} onClick={() => setBinType(opt.val)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${binType === opt.val ? "bg-white shadow text-stone-800" : "text-stone-400"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowCity(!showCity)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all ${showCity ? "bg-gray-600 text-white border-gray-600" : "bg-white text-stone-500 border-stone-200"}`}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: showCity ? "white" : "#6b7280" }} />
              City Bins {showCity ? "ON" : "OFF"}
            </button>
          </>
        )}
      </div>

      {/* Explainer card */}
      {showHotspot && (
        <div className="bg-gradient-to-r from-stone-800 to-stone-700 rounded-2xl p-4 text-white">
          {hotspotView === "score" ? (
            <>
              <p className="font-semibold text-sm mb-1">📊 Bin Placement Analysis</p>
              <p className="text-stone-300 text-xs leading-relaxed mb-3">
                Existing bins are scored by how fast they fill. 🔵 Blue dashed pins mark high-traffic spots with <strong>no bin within {SUGGEST_RADIUS}m</strong> — recommended new installations.
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(HOTSPOT_META).map(([key, m]) => (
                  <div key={key} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: m.color, border: key === "suggested" ? "2px dashed white" : "none" }} />
                    <div><p className="text-xs font-semibold">{m.label}</p><p className="text-[10px] text-stone-400">{m.desc}</p></div>
                  </div>
                ))}
              </div>
            </>
          ) : hotspotView === "trash" ? (
            <>
              <p className="font-semibold text-sm mb-1">🗑️ Trash Collector View</p>
              <p className="text-stone-300 text-xs">Pin numbers = days until each trash bin hits 80% full. Collect before reaching threshold.</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-sm mb-1">♻️ Recycle Collector View</p>
              <p className="text-stone-300 text-xs">Pin numbers = days until each recycle bin hits 80% full. Collect before reaching threshold.</p>
            </>
          )}
          {(hotspotView === "trash" || hotspotView === "recycle") && (
            <div className="flex gap-3 mt-3 flex-wrap">
              {[{ color: "#dc2626", label: "≤ 2 days — Urgent" }, { color: "#d97706", label: "2–5 days — Soon" }, { color: "#16a34a", label: "> 5 days — OK" }].map(l => (
                <div key={l.label} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                  <p className="text-xs font-semibold">{l.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statsCards.map(s => (
          <div key={s.label} className={`rounded-xl p-4 border ${s.accent ? "bg-red-50 border-red-200" : "bg-white border-stone-200"}`}>
            <div className="text-xl mb-1">{s.icon}</div>
            <div className={`text-xl font-bold ${s.accent ? "text-red-700" : "text-stone-800"}`}>{s.value}</div>
            <div className="text-xs font-medium text-stone-700">{s.label}</div>
            <div className="text-xs text-stone-400">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-sm" style={{ height: "min(500px, 60vh)" }}>
        {loading ? (
          <div className="w-full h-full bg-stone-100 flex items-center justify-center">
            <p className="text-stone-400 text-sm animate-pulse">Loading bins from database...</p>
          </div>
        ) : (
          <Map {...viewState} onMove={e => setViewState(e.viewState)}
            mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            style={{ width: "100%", height: "100%" }}>
            <NavigationControl position="top-right" />
            <FullscreenControl position="top-right" />

            {!showHotspot && bins.map(bin => (
              <Marker key={bin.id} latitude={bin.lat} longitude={bin.lng} anchor="bottom"
                onClick={e => { e.originalEvent.stopPropagation(); setSelectedBin(selectedBin?.id === bin.id ? null : bin); }}>
                <BinPin bin={bin} binType={binType} isSelected={selectedBin?.id === bin.id} />
              </Marker>
            ))}

            {showHotspot && allHotspotPins.filter(h => h.lat && h.lng).map(h => (
              <Marker key={`hs-${h.id}`} latitude={h.lat} longitude={h.lng} anchor="bottom"
                onClick={e => { e.originalEvent.stopPropagation(); setSelectedBin(selectedBin?.id === h.id ? null : h); }}>
                <HotspotPin bin={h} hotspotView={hotspotView} isSelected={selectedBin?.id === h.id} />
              </Marker>
            ))}

            {showCity && !showHotspot && cityBins.map(bin => (
              <Marker key={`city-${bin.id}`} latitude={bin.lat} longitude={bin.lng} anchor="center">
                <CityBinPin />
              </Marker>
            ))}

            {selectedBin && !showHotspot && <BinPopup bin={selectedBin} onClose={() => setSelectedBin(null)} />}
            {selectedBin && showHotspot  && <HotspotPopup bin={selectedBin} hotspotView={hotspotView} onClose={() => setSelectedBin(null)} />}
          </Map>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {showHotspot ? (
          hotspotView === "score" ? (
            Object.entries(HOTSPOT_META).map(([key, m]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-stone-500">
                <div className="w-3 h-3 rounded-full flex-shrink-0"
                 style={{ backgroundColor: m.color, border: key === "suggested" ? `2px dashed ${m.color}` : "none" }} />
                <span><strong>{m.label}</strong> — {m.desc}</span>
              </div>
            ))
          ) : (
            [{ color: "#dc2626", label: "≤ 2 days — Urgent" }, { color: "#d97706", label: "2–5 days — Soon" }, { color: "#16a34a", label: "> 5 days — On schedule" }, { color: "#9ca3af", label: "No data" }].map(l => (
              <div key={l.label} className="flex items-center gap-1.5 text-xs text-stone-500">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                {l.label}
              </div>
            ))
          )
        ) : (
          [{ label: "Critical (85%+)", color: "#dc2626" }, { label: "High (65–84%)", color: "#d97706" },
           { label: "Medium (40–64%)", color: "#ca8a04" }, { label: "Low (<40%)", color: "#16a34a" },
           { label: "City of Boston bin", color: "#6b7280" }].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-stone-500">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
              {l.label}
            </div>
          ))
        )}
      </div>

      {/* Hotspot table */}
      {showHotspot && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
            <h2 className="font-semibold text-stone-700 text-sm">
              {hotspotView === "score"   ? `Placement Analysis — BU ${CAMPUS_META[campus].label}` :
               hotspotView === "trash"   ? `🗑️ Trash Pickup Schedule` :
                                          `♻️ Recycle Pickup Schedule`}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-stone-400">
                {hotspotView === "score" ? `${hotspots.length} existing · ${suggestedPins.length} suggested` : `${hotspots.length} bins`}
              </span>
              {(hotspotView === "trash" || hotspotView === "recycle") && (
                <button
                  onClick={() => exportPickupCSV(hotspots, hotspotView, campus)}
                  className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                  ⬇️ Export CSV
                </button>
              )}
            </div>
          </div>
          <div className="divide-y divide-stone-50 max-h-80 overflow-y-auto">
            {/* Suggested pins shown first in score view */}
            {hotspotView === "score" && suggestedPins.map(h => (
              <div key={h.id}
                onClick={() => { setSelectedBin(h); setViewState({ latitude: h.lat, longitude: h.lng, zoom: 17 }); }}
                className="flex items-center gap-4 px-5 py-3 hover:bg-blue-50 cursor-pointer transition-colors bg-blue-50/50">
                <div className="w-3 h-3 rounded-full flex-shrink-0 border-2 border-blue-500" style={{ backgroundColor: "white" }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-blue-800 text-sm truncate">+ {h.name}</p>
                  <p className="text-xs text-blue-400">{h.reason} · no bin within {SUGGEST_RADIUS}m</p>
                </div>
                <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full flex-shrink-0">Suggested</span>
              </div>
            ))}
            {/* Existing bins */}
            {sortedHotspots.map(h => {
              const days  = hotspotView === "trash" ? h.waste_days_to_80 : hotspotView === "recycle" ? h.recycle_days_to_80 : null;
              const meta  = HOTSPOT_META[h.placement_status] || HOTSPOT_META.good;
              const color = hotspotView === "score" ? meta.color : getDaysColor(days);
              const displayRight = hotspotView === "score"
                ? { top: `${Math.round(h.hotspot_score)}`, bot: meta.label }
                : { top: days != null ? `${days.toFixed(1)}d` : "N/A", bot: getDaysLabel(days) };
              return (
                <div key={h.id}
                  onClick={() => { setSelectedBin(h); if (h.lat) setViewState({ latitude: h.lat, longitude: h.lng, zoom: 17 }); }}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-stone-50 cursor-pointer transition-colors">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-800 text-sm truncate">{h.description}</p>
                    <p className="text-xs text-stone-400">{h.campus} · avg {hotspotView === "recycle" ? `${h.recycle_days_to_fill?.toFixed(1) ?? "?"} days to fill (recycle)` : `${h.waste_days_to_fill?.toFixed(1) ?? "?"} days to fill (trash)`}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: hotspotView === "score" ? `${h.hotspot_score}%` : `${Math.min(100, ((days ?? 0) / 10) * 100)}%`, backgroundColor: color }} />
                      </div>
                      <span className="text-sm font-bold w-10 text-right" style={{ color }}>{displayRight.top}</span>
                    </div>
                    <p className="text-[10px] text-stone-400 text-right mt-0.5">{displayRight.bot}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart */}
      {!showHotspot && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <h2 className="font-bold text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>Fill Level Trends — BU {CAMPUS_META[campus].label}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setShowTrash(!showTrash)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${showTrash ? "bg-amber-700 text-white border-amber-700" : "bg-white text-stone-400 border-stone-200"}`}>
                🗑️ Trash
              </button>
              <button onClick={() => setShowRecycle(!showRecycle)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${showRecycle ? "bg-green-700 text-white border-green-700" : "bg-white text-stone-400 border-stone-200"}`}>
                ♻️ Recycle
              </button>
              <div className="flex bg-stone-100 rounded-xl p-0.5">
                {[{ val: "7days", label: "7 Days" }, { val: "6months", label: "6 Months" }].map(opt => (
                  <button key={opt.val} onClick={() => setTimeRange(opt.val)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${timeRange === opt.val ? "bg-white text-stone-800 shadow" : "text-stone-400"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DualBarChart data={chartData} showTrash={showTrash} showRecycle={showRecycle} />
        </div>
      )}

      {/* Bin table */}
      {!showHotspot && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
            <h2 className="font-semibold text-stone-700 text-sm">All Belly Bins — BU {CAMPUS_META[campus].label}</h2>
            <span className="text-xs text-stone-400">{bins.length} bins</span>
          </div>
          <div className="divide-y divide-stone-50 max-h-96 overflow-y-auto">
            {[...bins].sort((a, b) => Math.max(b.trash_fill, b.recycle_fill) - Math.max(a.trash_fill, a.recycle_fill)).map(bin => {
              const tc = getFillMeta(bin.trash_fill);
              const rc = getFillMeta(bin.recycle_fill);
              return (
                <div key={bin.id} onClick={() => { setSelectedBin(bin); setViewState({ latitude: bin.lat, longitude: bin.lng, zoom: 17 }); }}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-stone-50 cursor-pointer transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-800 text-sm truncate">{bin.notes || bin.address}</p>
                    <p className="text-xs text-stone-400 truncate">{bin.address}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {[{ val: bin.trash_fill, c: tc, label: "trash" }, { val: bin.recycle_fill, c: rc, label: "recycle" }].map(s => (
                      <div key={s.label} className="text-right">
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-14 bg-stone-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${s.val}%`, backgroundColor: s.c.color }} />
                          </div>
                          <span className="text-xs font-bold w-8" style={{ color: s.c.color }}>{s.val}%</span>
                        </div>
                        <p className="text-[10px] text-stone-400 text-right">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AIChatWidget />
    </div>
  );
}
