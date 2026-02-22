import { useState, useEffect, useRef } from "react";
import Map, { Marker, Popup, NavigationControl, FullscreenControl } from "react-map-gl";

const API = "http://localhost:3001";

const CAMPUS_META = {
  "charles-river": { label: "Charles River", lat: 42.3505, lng: -71.1054, zoom: 15, color: "#b45309" },
  "medical":        { label: "Medical",       lat: 42.3358, lng: -71.0720, zoom: 16, color: "#7c3aed" },
  "fenway":         { label: "Fenway",        lat: 42.3453, lng: -71.0994, zoom: 16, color: "#0f766e" },
};

const getFillMeta = (pct) => {
  if (pct >= 85) return { color: "#dc2626", bg: "#fee2e2", text: "#991b1b", label: "Critical" };
  if (pct >= 65) return { color: "#d97706", bg: "#fef3c7", text: "#92400e", label: "High"     };
  if (pct >= 40) return { color: "#ca8a04", bg: "#fefce8", text: "#713f12", label: "Medium"   };
  return               { color: "#16a34a", bg: "#dcfce7", text: "#14532d", label: "Low"      };
};

function BinPin({ bin, binType, isSelected }) {
  const val = binType === "recycle" ? bin.recycle_fill : bin.trash_fill;
  const { color } = getFillMeta(val);
  return (
    <div className="cursor-pointer flex flex-col items-center select-none" style={{ transform: "translate(-50%, -100%)" }}>
      {val >= 85 && (
        <div className="absolute rounded-full animate-ping"
          style={{ width: 32, height: 32, backgroundColor: color, opacity: 0.25, top: -4, left: "50%", transform: "translateX(-50%)" }} />
      )}
      <div className="relative flex items-center justify-center rounded-full text-white font-bold shadow-lg border-2 border-white transition-all duration-150"
        style={{ width: isSelected ? 40 : 30, height: isSelected ? 40 : 30, backgroundColor: color, fontSize: isSelected ? 10 : 8 }}>
        {binType === "recycle" ? "♻" : "🗑"}<span className="ml-0.5">{val}%</span>
      </div>
      <div style={{ width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: `7px solid ${color}`, marginTop: -1 }} />
    </div>
  );
}

function CityBinPin() {
  return (
    <div style={{ transform: "translate(-50%,-50%)" }}>
      <div className="w-3 h-3 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: "#6b7280" }} />
    </div>
  );
}

function BinPopup({ bin, onClose }) {
  const tc = getFillMeta(bin.trash_fill);
  const rc = getFillMeta(bin.recycle_fill);
  return (
    <Popup latitude={bin.lat} longitude={bin.lng} onClose={onClose}
      closeButton={true} closeOnClick={false} anchor="bottom" offset={20}>
      <div className="p-1 min-w-[200px]">
        <p className="font-bold text-stone-800 text-sm leading-tight">{bin.notes || bin.address}</p>
        <p className="text-xs text-stone-400 mb-3 truncate">{bin.address}</p>
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-stone-600 font-medium">🗑️ Trash</span>
            <span className="font-bold" style={{ color: tc.color }}>{bin.trash_fill}% · {tc.label}</span>
          </div>
          <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${bin.trash_fill}%`, backgroundColor: tc.color }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-stone-600 font-medium">♻️ Recycle</span>
            <span className="font-bold" style={{ color: rc.color }}>{bin.recycle_fill}% · {rc.label}</span>
          </div>
          <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${bin.recycle_fill}%`, backgroundColor: rc.color }} />
          </div>
        </div>
        <p className="text-[10px] text-stone-400 mt-2">{bin.campus} campus</p>
      </div>
    </Popup>
  );
}

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

function AIChatWidget() {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm EcoRoute AI 🤖 Ask me anything about BU's bin fill levels, which campus needs pickup most urgently, or request a full report!" }
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [report,  setReport]  = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    const history = messages.slice(1);
    setMessages(prev => [...prev, { role: "user", content: question }]);
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/ai/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, couldn't connect to the server. Make sure the backend is running on port 3001." }]);
    }
    setLoading(false);
  };

  const generateReport = async () => {
    setLoading(true); setReport(null);
    try {
      const res  = await fetch(`${API}/api/ai/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      setReport(data.report);
    } catch {
      setReport("Failed to generate report. Make sure the backend is running.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden" style={{ height: 480 }}>
          <div className="bg-stone-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <div>
                <p className="text-white font-semibold text-sm">EcoRoute AI</p>
                <p className="text-stone-400 text-xs">Powered by GPT-4o mini</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-white text-lg leading-none">✕</button>
          </div>

          <div className="px-3 pt-3">
            <button onClick={generateReport} disabled={loading}
              className="w-full bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
              {loading ? "Generating..." : "📊 Generate Full Campus Report"}
            </button>
          </div>

          {report && (
            <div className="mx-3 mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-stone-700 leading-relaxed max-h-32 overflow-y-auto">
              {report}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                  msg.role === "user" ? "bg-amber-700 text-white rounded-br-sm" : "bg-stone-100 text-stone-800 rounded-bl-sm"
                }`}>{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-stone-100 px-3 py-2 rounded-xl rounded-bl-sm">
                  <div className="flex gap-1">
                    {[0,150,300].map(d => (
                      <div key={d} className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
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
              className="bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors">
              →
            </button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(!open)}
        className="w-14 h-14 bg-stone-800 hover:bg-stone-700 text-white rounded-full shadow-xl flex items-center justify-center text-2xl transition-all duration-200 hover:scale-110">
        {open ? "✕" : "🤖"}
      </button>
    </div>
  );
}

export default function MapPage() {
  const [campus,      setCampus]      = useState("charles-river");
  const [binType,     setBinType]     = useState("trash");
  const [selectedBin, setSelectedBin] = useState(null);
  const [showTrash,   setShowTrash]   = useState(true);
  const [showRecycle, setShowRecycle] = useState(true);
  const [timeRange,   setTimeRange]   = useState("7days");
  const [showCity,    setShowCity]    = useState(false);
  const [bins,        setBins]        = useState([]);
  const [cityBins,    setCityBins]    = useState([]);
  const [stats,       setStats]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [viewState,   setViewState]   = useState({ latitude: 42.3505, longitude: -71.1054, zoom: 15 });

  useEffect(() => {
    setLoading(true); setSelectedBin(null);
    fetch(`${API}/api/bins?campus=${campus}`)
      .then(r => r.json())
      .then(d => { setBins(d.bins || []); setLoading(false); })
      .catch(() => { setError("Cannot connect to backend. Is the server running on port 3001?"); setLoading(false); });
  }, [campus]);

  useEffect(() => {
    fetch(`${API}/api/bins/stats`).then(r => r.json()).then(d => setStats(d.stats || [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API}/api/bins/city`).then(r => r.json()).then(d => setCityBins(d.bins || [])).catch(() => {});
  }, []);

  const switchCampus = (key) => {
    setCampus(key);
    setViewState({ latitude: CAMPUS_META[key].lat, longitude: CAMPUS_META[key].lng, zoom: CAMPUS_META[key].zoom });
  };

  const campusStats    = stats.find(s => s.campus === campus) || {};
  const criticalCount  = bins.filter(b => b.trash_fill >= 85 || b.recycle_fill >= 85).length;
  const chartData      = timeRange === "7days" ? SEVEN_DAY : SIX_MONTH;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>Campus Bin Map</h1>
          <p className="text-xs text-stone-400 mt-0.5">Click a pin to see fill data · Real data from BU Big Belly sensors</p>
        </div>
        {criticalCount > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2 self-start">
            <span className="text-lg">🚨</span>
            <div>
              <p className="text-red-700 font-semibold text-sm">{criticalCount} critical bins</p>
              <p className="text-red-400 text-xs">Needs pickup soon</p>
            </div>
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">⚠️ {error}</div>}

      <div className="flex gap-2 flex-wrap">
        {Object.entries(CAMPUS_META).map(([key, m]) => (
          <button key={key} onClick={() => switchCampus(key)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all duration-200"
            style={campus === key ? { backgroundColor: m.color, borderColor: m.color, color: "white" } : { backgroundColor: "white", borderColor: "#e7e5e4", color: "#57534e" }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: campus === key ? "white" : m.color }} />
            BU {m.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-stone-500 font-medium">Pin view:</span>
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
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: "🗑️", label: "BU Bins",    value: loading ? "..." : bins.length,                       sub: `on ${CAMPUS_META[campus].label}` },
          { icon: "📊", label: "Avg Trash",   value: loading ? "..." : `${campusStats.avg_trash   ?? 0}%`, sub: "fill level" },
          { icon: "♻️", label: "Avg Recycle", value: loading ? "..." : `${campusStats.avg_recycle  ?? 0}%`, sub: "fill level" },
          { icon: "🚨", label: "Critical",    value: loading ? "..." : criticalCount,                      sub: "need pickup", accent: criticalCount > 0 },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 border ${s.accent ? "bg-red-50 border-red-200" : "bg-white border-stone-200"}`}>
            <div className="text-xl mb-1">{s.icon}</div>
            <div className={`text-xl font-bold ${s.accent ? "text-red-700" : "text-stone-800"}`}>{s.value}</div>
            <div className="text-xs font-medium text-stone-700">{s.label}</div>
            <div className="text-xs text-stone-400">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-sm" style={{ height: 500 }}>
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
            {bins.map(bin => (
              <Marker key={bin.id} latitude={bin.lat} longitude={bin.lng} anchor="bottom"
                onClick={e => { e.originalEvent.stopPropagation(); setSelectedBin(selectedBin?.id === bin.id ? null : bin); }}>
                <BinPin bin={bin} binType={binType} isSelected={selectedBin?.id === bin.id} />
              </Marker>
            ))}
            {showCity && cityBins.map(bin => (
              <Marker key={`city-${bin.id}`} latitude={bin.lat} longitude={bin.lng} anchor="center">
                <CityBinPin />
              </Marker>
            ))}
            {selectedBin && <BinPopup bin={selectedBin} onClose={() => setSelectedBin(null)} />}
          </Map>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {[
          { label: "Critical (85%+)",      color: "#dc2626" },
          { label: "High (65–84%)",        color: "#d97706" },
          { label: "Medium (40–64%)",      color: "#ca8a04" },
          { label: "Low (<40%)",           color: "#16a34a" },
          { label: "City of Boston bin",   color: "#6b7280" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-xs text-stone-500">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
            {l.label}
          </div>
        ))}
      </div>

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
        <div className="flex gap-4 mt-2 text-xs text-stone-400">
          {showTrash   && <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm inline-block bg-amber-700" /> Trash avg fill %</span>}
          {showRecycle && <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm inline-block bg-green-700" /> Recycle avg fill %</span>}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-semibold text-stone-700 text-sm">All Belly Bins — BU {CAMPUS_META[campus].label}</h2>
          <span className="text-xs text-stone-400">{bins.length} bins</span>
        </div>
        <div className="divide-y divide-stone-50 max-h-96 overflow-y-auto">
          {[...bins].sort((a, b) => Math.max(b.trash_fill, b.recycle_fill) - Math.max(a.trash_fill, a.recycle_fill))
            .map(bin => {
              const tc = getFillMeta(bin.trash_fill);
              const rc = getFillMeta(bin.recycle_fill);
              return (
                <div key={bin.id}
                  onClick={() => { setSelectedBin(bin); setViewState({ latitude: bin.lat, longitude: bin.lng, zoom: 17 }); }}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-stone-50 cursor-pointer transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-800 text-sm truncate">{bin.notes || bin.address}</p>
                    <p className="text-xs text-stone-400 truncate">{bin.address}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-14 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${bin.trash_fill}%`, backgroundColor: tc.color }} />
                        </div>
                        <span className="text-xs font-bold w-8" style={{ color: tc.color }}>{bin.trash_fill}%</span>
                      </div>
                      <p className="text-[10px] text-stone-400 text-right">trash</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-14 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${bin.recycle_fill}%`, backgroundColor: rc.color }} />
                        </div>
                        <span className="text-xs font-bold w-8" style={{ color: rc.color }}>{bin.recycle_fill}%</span>
                      </div>
                      <p className="text-[10px] text-stone-400 text-right">recycle</p>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <AIChatWidget />
    </div>
  );
}