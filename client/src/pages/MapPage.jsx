import { useState, useCallback } from "react";
import Map, { Marker, Popup, NavigationControl, FullscreenControl } from "react-map-gl";

// ─── Mock Data (swap with real CSV data when teammates finish parsing) ─────────

const BINS = {
  "charles-river": [
    { id: "cr1", name: "GSU Plaza - East",    lat: 42.3505, lng: -71.1054, trash: 87, recycle: 62, address: "775 Commonwealth Ave" },
    { id: "cr2", name: "Marsh Chapel",         lat: 42.3496, lng: -71.1003, trash: 45, recycle: 38, address: "735 Commonwealth Ave" },
    { id: "cr3", name: "CAS Front Entrance",   lat: 42.3508, lng: -71.1078, trash: 73, recycle: 55, address: "725 Commonwealth Ave" },
    { id: "cr4", name: "Agganis Arena",         lat: 42.3528, lng: -71.1133, trash: 28, recycle: 22, address: "925 Commonwealth Ave" },
    { id: "cr5", name: "Questrom East",         lat: 42.3491, lng: -71.0976, trash: 91, recycle: 78, address: "595 Commonwealth Ave" },
    { id: "cr6", name: "Student Village",       lat: 42.3520, lng: -71.1100, trash: 55, recycle: 44, address: "10 Buick St" },
    { id: "cr7", name: "BU Beach",              lat: 42.3513, lng: -71.1058, trash: 82, recycle: 70, address: "Storrow Dr side" },
    { id: "cr8", name: "Warren Towers",         lat: 42.3488, lng: -71.0995, trash: 67, recycle: 50, address: "700 Commonwealth Ave" },
  ],
  "medical": [
    { id: "med1", name: "L-Building Entry",    lat: 42.3356, lng: -71.0723, trash: 88, recycle: 72, address: "72 E Concord St" },
    { id: "med2", name: "BUSM Courtyard",       lat: 42.3362, lng: -71.0731, trash: 54, recycle: 41, address: "80 E Concord St" },
    { id: "med3", name: "Instructional Bldg",   lat: 42.3350, lng: -71.0710, trash: 39, recycle: 30, address: "670 Albany St" },
    { id: "med4", name: "Medical Library",      lat: 42.3368, lng: -71.0718, trash: 76, recycle: 60, address: "12 E Newton St" },
  ],
  "fenway": [
    { id: "fen1", name: "Fenway Campus Main",   lat: 42.3453, lng: -71.0994, trash: 72, recycle: 65, address: "871 Commonwealth Ave" },
    { id: "fen2", name: "Sargent College",      lat: 42.3461, lng: -71.1010, trash: 48, recycle: 35, address: "635 Commonwealth Ave" },
    { id: "fen3", name: "SHA Building",         lat: 42.3447, lng: -71.0980, trash: 83, recycle: 74, address: "928 Commonwealth Ave" },
  ],
};

const CAMPUS_META = {
  "charles-river": { label: "Charles River", lat: 42.3505, lng: -71.1054, zoom: 15, color: "#b45309" },
  "medical":        { label: "Medical",       lat: 42.3358, lng: -71.0720, zoom: 16, color: "#7c3aed" },
  "fenway":         { label: "Fenway",        lat: 42.3453, lng: -71.0994, zoom: 16, color: "#0f766e" },
};

const SIX_MONTH_DATA = [
  { label: "Sep", trash: 58, recycle: 42 },
  { label: "Oct", trash: 63, recycle: 48 },
  { label: "Nov", trash: 71, recycle: 52 },
  { label: "Dec", trash: 55, recycle: 38 },
  { label: "Jan", trash: 79, recycle: 61 },
  { label: "Feb", trash: 82, recycle: 67 },
];

const SEVEN_DAY_DATA = [
  { label: "Mon", trash: 72, recycle: 55 },
  { label: "Tue", trash: 68, recycle: 50 },
  { label: "Wed", trash: 85, recycle: 71 },
  { label: "Thu", trash: 74, recycle: 58 },
  { label: "Fri", trash: 91, recycle: 80 },
  { label: "Sat", trash: 48, recycle: 32 },
  { label: "Sun", trash: 37, recycle: 24 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getFillMeta = (pct) => {
  if (pct >= 85) return { color: "#dc2626", bg: "#fee2e2", text: "#991b1b", label: "Critical" };
  if (pct >= 65) return { color: "#d97706", bg: "#fef3c7", text: "#92400e", label: "High"     };
  if (pct >= 40) return { color: "#ca8a04", bg: "#fefce8", text: "#713f12", label: "Medium"   };
  return               { color: "#16a34a", bg: "#dcfce7", text: "#14532d", label: "Low"      };
};

// ─── Pin Component ────────────────────────────────────────────────────────────

function BinPin({ bin, binType, isSelected, onClick }) {
  const val = binType === "recycle" ? bin.recycle : bin.trash;
  const { color } = getFillMeta(val);
  const pulse = val >= 85;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer flex flex-col items-center select-none"
      style={{ transform: "translate(-50%, -100%)" }}
    >
      {/* Pulse ring */}
      {pulse && (
        <div
          className="absolute rounded-full animate-ping"
          style={{
            width: 32, height: 32,
            backgroundColor: color,
            opacity: 0.3,
            top: -4, left: "50%",
            transform: "translateX(-50%)",
          }}
        />
      )}
      {/* Pin circle */}
      <div
        className="relative flex items-center justify-center rounded-full text-white font-bold text-xs shadow-lg border-2 border-white transition-all duration-150"
        style={{
          width:  isSelected ? 40 : 32,
          height: isSelected ? 40 : 32,
          backgroundColor: color,
          fontSize: isSelected ? 11 : 9,
        }}
      >
        {binType === "recycle" ? "♻" : "🗑"}
        <span className="ml-0.5">{val}%</span>
      </div>
      {/* Pin tail */}
      <div
        style={{
          width: 0, height: 0,
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: `8px solid ${color}`,
          marginTop: -1,
        }}
      />
    </div>
  );
}

// ─── Popup Card ───────────────────────────────────────────────────────────────

function BinPopup({ bin, onClose }) {
  const tc = getFillMeta(bin.trash);
  const rc = getFillMeta(bin.recycle);

  return (
    <Popup
      latitude={bin.lat}
      longitude={bin.lng}
      onClose={onClose}
      closeButton={true}
      closeOnClick={false}
      anchor="bottom"
      offset={20}
    >
      <div className="p-1 min-w-[180px]">
        <p className="font-bold text-stone-800 text-sm">{bin.name}</p>
        <p className="text-xs text-stone-400 mb-3">{bin.address}</p>

        {/* Trash bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-stone-600 font-medium">🗑️ Trash</span>
            <span className="font-bold" style={{ color: tc.color }}>{bin.trash}% · {tc.label}</span>
          </div>
          <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${bin.trash}%`, backgroundColor: tc.color }} />
          </div>
        </div>

        {/* Recycle bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-stone-600 font-medium">♻️ Recycle</span>
            <span className="font-bold" style={{ color: rc.color }}>{bin.recycle}% · {rc.label}</span>
          </div>
          <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${bin.recycle}%`, backgroundColor: rc.color }} />
          </div>
        </div>
      </div>
    </Popup>
  );
}

// ─── Chart ────────────────────────────────────────────────────────────────────

function DualBarChart({ data, showTrash, showRecycle }) {
  const max = 100;
  return (
    <div className="flex items-end gap-2 h-32 w-full">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col items-center flex-1 gap-1">
          <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: 108 }}>
            {showTrash && (
              <div className="flex-1 rounded-t-md transition-all duration-700 min-w-0"
                style={{ height: `${(d.trash / max) * 106}px`, backgroundColor: "#b45309" }} />
            )}
            {showRecycle && (
              <div className="flex-1 rounded-t-md transition-all duration-700 min-w-0"
                style={{ height: `${(d.recycle / max) * 106}px`, backgroundColor: "#15803d" }} />
            )}
          </div>
          <span className="text-[10px] text-stone-400 font-medium">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MapPage() {
  const [campus,      setCampus]      = useState("charles-river");
  const [binType,     setBinType]     = useState("trash");
  const [selectedBin, setSelectedBin] = useState(null);
  const [showTrash,   setShowTrash]   = useState(true);
  const [showRecycle, setShowRecycle] = useState(true);
  const [timeRange,   setTimeRange]   = useState("7days");

  const [viewState, setViewState] = useState({
    latitude:  42.3505,
    longitude: -71.1054,
    zoom: 15,
  });

  const meta       = CAMPUS_META[campus];
  const bins       = BINS[campus];
  const chartData  = timeRange === "7days" ? SEVEN_DAY_DATA : SIX_MONTH_DATA;
  const criticalCount = bins.filter(b => Math.max(b.trash, b.recycle) >= 85).length;
  const avgTrash   = Math.round(bins.reduce((s, b) => s + b.trash,   0) / bins.length);
  const avgRecycle = Math.round(bins.reduce((s, b) => s + b.recycle, 0) / bins.length);

  const switchCampus = (key) => {
    setCampus(key);
    setSelectedBin(null);
    setViewState({
      latitude:  CAMPUS_META[key].lat,
      longitude: CAMPUS_META[key].lng,
      zoom:      CAMPUS_META[key].zoom,
    });
  };

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>
            Campus Bin Map
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Click a pin to see fill data · Each belly bin has a trash + recycle unit
          </p>
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

      {/* ── Campus Toggle ── */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(CAMPUS_META).map(([key, m]) => (
          <button
            key={key}
            onClick={() => switchCampus(key)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all duration-200"
            style={campus === key
              ? { backgroundColor: m.color, borderColor: m.color, color: "white" }
              : { backgroundColor: "white", borderColor: "#e7e5e4", color: "#57534e" }}
          >
            <div className="w-2 h-2 rounded-full"
              style={{ backgroundColor: campus === key ? "white" : m.color }} />
            BU {m.label}
          </button>
        ))}
      </div>

      {/* ── Bin Type Toggle ── */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-stone-500 font-medium">Pin view:</span>
        <div className="flex bg-stone-100 rounded-xl p-1 gap-1">
          {[
            { val: "trash",   label: "🗑️ Trash"   },
            { val: "recycle", label: "♻️ Recycle" },
          ].map((opt) => (
            <button
              key={opt.val}
              onClick={() => setBinType(opt.val)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                binType === opt.val
                  ? "bg-white shadow text-stone-800"
                  : "text-stone-400 hover:text-stone-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: "🗑️", label: "Belly Bins",    value: bins.length,     sub: `on ${meta.label}` },
          { icon: "📊", label: "Avg Trash",      value: `${avgTrash}%`,  sub: "fill level"       },
          { icon: "♻️", label: "Avg Recycle",    value: `${avgRecycle}%`,sub: "fill level"       },
          { icon: "🚨", label: "Critical",        value: criticalCount,   sub: "need pickup", accent: criticalCount > 0 },
        ].map((s) => (
          <div key={s.label}
            className={`rounded-xl p-4 border ${s.accent ? "bg-red-50 border-red-200" : "bg-white border-stone-200"}`}>
            <div className="text-xl mb-1">{s.icon}</div>
            <div className={`text-xl font-bold ${s.accent ? "text-red-700" : "text-stone-800"}`}>{s.value}</div>
            <div className="text-xs font-medium text-stone-700">{s.label}</div>
            <div className="text-xs text-stone-400">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Mapbox Map ── */}
      <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-sm" style={{ height: 480 }}>
        <Map
          {...viewState}
          onMove={(e) => setViewState(e.viewState)}
          mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="top-right" />
          <FullscreenControl position="top-right" />

          {bins.map((bin) => (
            <Marker
              key={bin.id}
              latitude={bin.lat}
              longitude={bin.lng}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedBin(bin.id === selectedBin?.id ? null : bin);
              }}
            >
              <BinPin
                bin={bin}
                binType={binType}
                isSelected={selectedBin?.id === bin.id}
                onClick={() => {}}
              />
            </Marker>
          ))}

          {selectedBin && (
            <BinPopup
              bin={selectedBin}
              onClose={() => setSelectedBin(null)}
            />
          )}
        </Map>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {[
          { label: "Critical (85%+)", color: "#dc2626" },
          { label: "High (65–84%)",   color: "#d97706" },
          { label: "Medium (40–64%)", color: "#ca8a04" },
          { label: "Low (<40%)",      color: "#16a34a" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5 text-xs text-stone-500">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* ── Chart ── */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <h2 className="font-bold text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>
            Fill Level Trends — BU {meta.label}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Trash / Recycle toggles */}
            <button
              onClick={() => setShowTrash(!showTrash)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                showTrash ? "bg-amber-700 text-white border-amber-700" : "bg-white text-stone-400 border-stone-200"
              }`}
            >
              🗑️ Trash
            </button>
            <button
              onClick={() => setShowRecycle(!showRecycle)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                showRecycle ? "bg-green-700 text-white border-green-700" : "bg-white text-stone-400 border-stone-200"
              }`}
            >
              ♻️ Recycle
            </button>
            {/* Time range */}
            <div className="flex bg-stone-100 rounded-xl p-0.5">
              {[{ val: "7days", label: "7 Days" }, { val: "6months", label: "6 Months" }].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setTimeRange(opt.val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    timeRange === opt.val ? "bg-white text-stone-800 shadow" : "text-stone-400"
                  }`}
                >
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

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-stone-100 text-center">
          {[
            { label: "Peak Trash",    value: chartData.reduce((a, b) => a.trash   > b.trash   ? a : b).label },
            { label: "Peak Recycle",  value: chartData.reduce((a, b) => a.recycle > b.recycle ? a : b).label },
            { label: "Avg Trash",     value: `${Math.round(chartData.reduce((s, d) => s + d.trash,   0) / chartData.length)}%` },
            { label: "Avg Recycle",   value: `${Math.round(chartData.reduce((s, d) => s + d.recycle, 0) / chartData.length)}%` },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-lg font-bold text-stone-800">{s.value}</p>
              <p className="text-xs text-stone-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bin Table ── */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-semibold text-stone-700 text-sm">All Belly Bins — BU {meta.label}</h2>
          <span className="text-xs text-stone-400">{bins.length} bins</span>
        </div>
        <div className="divide-y divide-stone-50">
          {[...bins]
            .sort((a, b) => Math.max(b.trash, b.recycle) - Math.max(a.trash, a.recycle))
            .map((bin) => {
              const tc = getFillMeta(bin.trash);
              const rc = getFillMeta(bin.recycle);
              return (
                <div key={bin.id}
                  onClick={() => {
                    setSelectedBin(bin);
                    setViewState({ latitude: bin.lat, longitude: bin.lng, zoom: 17 });
                  }}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-stone-50 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-800 text-sm truncate">{bin.name}</p>
                    <p className="text-xs text-stone-400 truncate">{bin.address}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <div className="h-1.5 w-14 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${bin.trash}%`, backgroundColor: tc.color }} />
                        </div>
                        <span className="text-xs font-bold w-8 text-right" style={{ color: tc.color }}>{bin.trash}%</span>
                      </div>
                      <p className="text-[10px] text-stone-400 text-right mt-0.5">trash</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <div className="h-1.5 w-14 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${bin.recycle}%`, backgroundColor: rc.color }} />
                        </div>
                        <span className="text-xs font-bold w-8 text-right" style={{ color: rc.color }}>{bin.recycle}%</span>
                      </div>
                      <p className="text-[10px] text-stone-400 text-right mt-0.5">recycle</p>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

    </div>
  );
}