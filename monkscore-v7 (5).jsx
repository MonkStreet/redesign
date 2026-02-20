import { useState, useEffect, useRef, useCallback } from "react";

const BRAND = {
  bg: "#0f1525",
  cardBg: "#171e32",
  cardBorder: "rgba(255,255,255,0.06)",
  accent: "#4b7bff",
  green: "#34d399",
  greenBright: "#22c55e",
  yellow: "#fbbf24",
  orange: "#f97316",
  red: "#ef4444",
  textPrimary: "#f0f2f8",
  textSecondary: "rgba(255,255,255,0.5)",
  textMuted: "rgba(255,255,255,0.28)",
};

const PILLAR_KEYS = ["value", "growth", "profitability", "health", "payout"];

const getScoreColor = (score) => {
  if (score >= 80) return BRAND.greenBright;
  if (score >= 60) return BRAND.green;
  if (score >= 40) return BRAND.yellow;
  if (score >= 20) return BRAND.orange;
  return BRAND.red;
};

const getOverallColor = (score) => getScoreColor(score);

const getInsightParts = (score) => {
  if (score >= 90) return { colored: "Extremely likely", rest: " to beat the market" };
  if (score >= 75) return { colored: "Very likely", rest: " to beat the market" };
  if (score >= 60) return { colored: "Likely", rest: " to beat the market" };
  if (score >= 45) return { colored: "May perform", rest: " in line with market" };
  if (score >= 30) return { colored: "Unlikely", rest: " to beat the market" };
  return { colored: "Very unlikely", rest: " to beat the market" };
};

// ── Smooth curves ──
const ANGLE_OFFSET = -Math.PI / 2;

const getPoint = (index, value, maxValue, cx, cy, radius) => {
  const angle = ANGLE_OFFSET + (2 * Math.PI * index) / 5;
  const r = (value / maxValue) * radius;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
};

const catmullRomToBezier = (points, tension = 0.35) => {
  const n = points.length;
  if (n < 3) return "";
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    d += ` C ${p1.x + (p2.x - p0.x) * tension},${p1.y + (p2.y - p0.y) * tension} ${p2.x - (p3.x - p1.x) * tension},${p2.y - (p3.y - p1.y) * tension} ${p2.x},${p2.y}`;
  }
  return d;
};

const getSmoothPath = (scores, cx, cy, radius, maxValue = 100) => {
  const points = PILLAR_KEYS.map((key, i) =>
    getPoint(i, Math.max(scores[key] || 0, 2), maxValue, cx, cy, radius)
  );
  return catmullRomToBezier(points);
};

// ── Mock DB ──
const STOCK_DB = {
  AAPL: {
    ticker: "AAPL", exchange: "NASDAQ", name: "Apple Inc.", monkScore: 82, prevMonkScore: 79, peers: ["MSFT", "GOOGL"],
    pillars: {
      value: { score: 62, label: "Value", topFactors: [{ name: "P/E Ratio", value: "28.4x", score: 55 }, { name: "EV/EBITDA", value: "21.1x", score: 64 }, { name: "P/FCF", value: "25.7x", score: 60 }] },
      growth: { score: 78, label: "Growth", topFactors: [{ name: "Revenue Growth (3Y)", value: "8.2%", score: 72 }, { name: "EPS Growth (3Y)", value: "12.4%", score: 81 }, { name: "FCF Growth (3Y)", value: "10.1%", score: 76 }] },
      profitability: { score: 95, label: "Profitability", topFactors: [{ name: "Net Margin", value: "25.3%", score: 93 }, { name: "ROE", value: "147.2%", score: 99 }, { name: "ROIC", value: "52.8%", score: 96 }] },
      health: { score: 83, label: "Health", topFactors: [{ name: "Current Ratio", value: "1.07", score: 64 }, { name: "Interest Coverage", value: "29.4x", score: 92 }, { name: "Altman Z-Score", value: "5.8", score: 88 }] },
      payout: { score: 74, label: "Payout", topFactors: [{ name: "Payout Ratio", value: "15.4%", score: 91 }, { name: "Buyback Yield", value: "3.8%", score: 85 }, { name: "Div Growth (5Y)", value: "5.6%", score: 72 }] },
    },
  },
  MSFT: {
    ticker: "MSFT", exchange: "NASDAQ", name: "Microsoft Corp.", monkScore: 88, prevMonkScore: 84, peers: ["AAPL", "GOOGL"],
    pillars: {
      value: { score: 52, label: "Value", topFactors: [{ name: "P/E Ratio", value: "34.2x", score: 42 }, { name: "EV/EBITDA", value: "24.8x", score: 53 }, { name: "P/FCF", value: "31.4x", score: 48 }] },
      growth: { score: 88, label: "Growth", topFactors: [{ name: "Revenue Growth (3Y)", value: "14.2%", score: 86 }, { name: "EPS Growth (3Y)", value: "16.8%", score: 89 }, { name: "FCF Growth (3Y)", value: "13.5%", score: 84 }] },
      profitability: { score: 98, label: "Profitability", topFactors: [{ name: "Net Margin", value: "35.4%", score: 97 }, { name: "ROE", value: "38.6%", score: 94 }, { name: "ROIC", value: "28.4%", score: 89 }] },
      health: { score: 91, label: "Health", topFactors: [{ name: "Current Ratio", value: "1.24", score: 76 }, { name: "Interest Coverage", value: "42.1x", score: 97 }, { name: "Altman Z-Score", value: "8.2", score: 95 }] },
      payout: { score: 85, label: "Payout", topFactors: [{ name: "Payout Ratio", value: "24.8%", score: 89 }, { name: "Buyback Yield", value: "1.2%", score: 64 }, { name: "Div Growth (5Y)", value: "10.2%", score: 86 }] },
    },
  },
  GOOGL: {
    ticker: "GOOGL", exchange: "NASDAQ", name: "Alphabet Inc.", monkScore: 85, prevMonkScore: 87, peers: ["MSFT", "META"],
    pillars: {
      value: { score: 68, label: "Value", topFactors: [{ name: "P/E Ratio", value: "23.1x", score: 66 }, { name: "EV/EBITDA", value: "16.8x", score: 72 }, { name: "P/FCF", value: "28.4x", score: 58 }] },
      growth: { score: 82, label: "Growth", topFactors: [{ name: "Revenue Growth (3Y)", value: "12.8%", score: 80 }, { name: "EPS Growth (3Y)", value: "24.6%", score: 88 }, { name: "FCF Growth (3Y)", value: "15.2%", score: 82 }] },
      profitability: { score: 92, label: "Profitability", topFactors: [{ name: "Net Margin", value: "24.1%", score: 91 }, { name: "ROE", value: "29.8%", score: 88 }, { name: "ROIC", value: "24.2%", score: 86 }] },
      health: { score: 94, label: "Health", topFactors: [{ name: "Current Ratio", value: "2.14", score: 92 }, { name: "Interest Coverage", value: "78.4x", score: 98 }, { name: "Altman Z-Score", value: "9.1", score: 97 }] },
      payout: { score: 71, label: "Payout", topFactors: [{ name: "Payout Ratio", value: "5.2%", score: 48 }, { name: "Buyback Yield", value: "4.1%", score: 89 }, { name: "Div Growth (5Y)", value: "N/A", score: 10 }] },
    },
  },
  META: {
    ticker: "META", exchange: "NASDAQ", name: "Meta Platforms", monkScore: 79, prevMonkScore: 72, peers: ["GOOGL", "SNAP"],
    pillars: {
      value: { score: 58, label: "Value", topFactors: [{ name: "P/E Ratio", value: "26.8x", score: 56 }, { name: "EV/EBITDA", value: "15.2x", score: 74 }, { name: "P/FCF", value: "22.1x", score: 64 }] },
      growth: { score: 85, label: "Growth", topFactors: [{ name: "Revenue Growth (3Y)", value: "16.4%", score: 84 }, { name: "EPS Growth (3Y)", value: "38.2%", score: 92 }, { name: "FCF Growth (3Y)", value: "22.8%", score: 86 }] },
      profitability: { score: 90, label: "Profitability", topFactors: [{ name: "Net Margin", value: "28.4%", score: 92 }, { name: "ROE", value: "24.6%", score: 82 }, { name: "ROIC", value: "19.8%", score: 80 }] },
      health: { score: 86, label: "Health", topFactors: [{ name: "Current Ratio", value: "2.68", score: 94 }, { name: "Interest Coverage", value: "34.2x", score: 92 }, { name: "Altman Z-Score", value: "7.4", score: 92 }] },
      payout: { score: 62, label: "Payout", topFactors: [{ name: "Payout Ratio", value: "8.4%", score: 52 }, { name: "Buyback Yield", value: "3.2%", score: 82 }, { name: "Div Growth (5Y)", value: "N/A", score: 8 }] },
    },
  },
  TSLA: {
    ticker: "TSLA", exchange: "NASDAQ", name: "Tesla, Inc.", monkScore: 51, prevMonkScore: 55, peers: ["RIVN", "GM"],
    pillars: {
      value: { score: 12, label: "Value", topFactors: [{ name: "P/E Ratio", value: "112x", score: 6 }, { name: "EV/EBITDA", value: "68.4x", score: 10 }, { name: "P/FCF", value: "89.2x", score: 9 }] },
      growth: { score: 71, label: "Growth", topFactors: [{ name: "Revenue Growth (3Y)", value: "22.4%", score: 88 }, { name: "EPS Growth (3Y)", value: "-8.2%", score: 22 }, { name: "FCF Growth (3Y)", value: "18.6%", score: 83 }] },
      profitability: { score: 58, label: "Profitability", topFactors: [{ name: "Net Margin", value: "7.2%", score: 48 }, { name: "ROE", value: "18.4%", score: 62 }, { name: "ROIC", value: "12.6%", score: 56 }] },
      health: { score: 82, label: "Health", topFactors: [{ name: "Current Ratio", value: "1.84", score: 86 }, { name: "Interest Coverage", value: "18.2x", score: 81 }, { name: "Altman Z-Score", value: "6.4", score: 91 }] },
      payout: { score: 18, label: "Payout", topFactors: [{ name: "Dividend Yield", value: "0%", score: 2 }, { name: "Payout Ratio", value: "0%", score: 38 }, { name: "Buyback Yield", value: "0%", score: 2 }] },
    },
  },
  NVDA: {
    ticker: "NVDA", exchange: "NASDAQ", name: "NVIDIA Corp.", monkScore: 91, prevMonkScore: 83, peers: ["AMD", "INTC"],
    pillars: {
      value: { score: 38, label: "Value", topFactors: [{ name: "P/E Ratio", value: "62.4x", score: 18 }, { name: "EV/EBITDA", value: "48.2x", score: 22 }, { name: "P/FCF", value: "52.1x", score: 20 }] },
      growth: { score: 99, label: "Growth", topFactors: [{ name: "Revenue Growth (3Y)", value: "68.4%", score: 99 }, { name: "EPS Growth (3Y)", value: "112%", score: 99 }, { name: "FCF Growth (3Y)", value: "78.2%", score: 99 }] },
      profitability: { score: 97, label: "Profitability", topFactors: [{ name: "Net Margin", value: "55.8%", score: 99 }, { name: "ROE", value: "115%", score: 98 }, { name: "ROIC", value: "68.4%", score: 98 }] },
      health: { score: 92, label: "Health", topFactors: [{ name: "Current Ratio", value: "4.12", score: 98 }, { name: "Interest Coverage", value: "92.1x", score: 99 }, { name: "Altman Z-Score", value: "18.4", score: 99 }] },
      payout: { score: 55, label: "Payout", topFactors: [{ name: "Payout Ratio", value: "1.2%", score: 42 }, { name: "Buyback Yield", value: "0.8%", score: 48 }, { name: "Div Growth (5Y)", value: "12.4%", score: 78 }] },
    },
  },
  AMZN: {
    ticker: "AMZN", exchange: "NASDAQ", name: "Amazon.com Inc.", monkScore: 76, prevMonkScore: 74, peers: ["MSFT", "GOOGL"],
    pillars: {
      value: { score: 44, label: "Value", topFactors: [{ name: "P/E Ratio", value: "42.8x", score: 28 }, { name: "EV/EBITDA", value: "18.4x", score: 68 }, { name: "P/FCF", value: "36.2x", score: 38 }] },
      growth: { score: 80, label: "Growth", topFactors: [{ name: "Revenue Growth (3Y)", value: "11.8%", score: 76 }, { name: "EPS Growth (3Y)", value: "52.4%", score: 94 }, { name: "FCF Growth (3Y)", value: "28.6%", score: 88 }] },
      profitability: { score: 78, label: "Profitability", topFactors: [{ name: "Net Margin", value: "7.8%", score: 52 }, { name: "ROE", value: "22.4%", score: 78 }, { name: "ROIC", value: "14.2%", score: 72 }] },
      health: { score: 82, label: "Health", topFactors: [{ name: "Current Ratio", value: "1.08", score: 58 }, { name: "Interest Coverage", value: "18.4x", score: 84 }, { name: "Altman Z-Score", value: "5.2", score: 86 }] },
      payout: { score: 42, label: "Payout", topFactors: [{ name: "Dividend Yield", value: "0%", score: 2 }, { name: "Buyback Yield", value: "0.4%", score: 32 }, { name: "FCF Yield", value: "2.8%", score: 62 }] },
    },
  },
  TEF: {
    ticker: "TEF", exchange: "BME", name: "Telefónica S.A.", monkScore: 64, prevMonkScore: 66, peers: ["VOD", "DTE"],
    pillars: {
      value: { score: 82, label: "Value", topFactors: [{ name: "P/E Ratio", value: "11.2x", score: 84 }, { name: "EV/EBITDA", value: "5.8x", score: 88 }, { name: "P/FCF", value: "8.4x", score: 80 }] },
      growth: { score: 32, label: "Growth", topFactors: [{ name: "Revenue Growth (3Y)", value: "1.2%", score: 28 }, { name: "EPS Growth (3Y)", value: "4.8%", score: 38 }, { name: "FCF Growth (3Y)", value: "-2.1%", score: 18 }] },
      profitability: { score: 48, label: "Profitability", topFactors: [{ name: "Net Margin", value: "5.4%", score: 42 }, { name: "ROE", value: "8.2%", score: 46 }, { name: "ROIC", value: "4.8%", score: 38 }] },
      health: { score: 38, label: "Health", topFactors: [{ name: "Current Ratio", value: "0.82", score: 32 }, { name: "Interest Coverage", value: "3.2x", score: 34 }, { name: "Altman Z-Score", value: "1.4", score: 28 }] },
      payout: { score: 88, label: "Payout", topFactors: [{ name: "Dividend Yield", value: "7.2%", score: 94 }, { name: "Payout Ratio", value: "62%", score: 68 }, { name: "Div Growth (5Y)", value: "3.1%", score: 52 }] },
    },
  },
  SAP: {
    ticker: "SAP", exchange: "XETRA", name: "SAP SE", monkScore: 78, prevMonkScore: 75, peers: ["ORCL", "CRM"],
    pillars: {
      value: { score: 42, label: "Value", topFactors: [{ name: "P/E Ratio", value: "38.4x", score: 32 }, { name: "EV/EBITDA", value: "22.1x", score: 48 }, { name: "P/FCF", value: "28.6x", score: 44 }] },
      growth: { score: 76, label: "Growth", topFactors: [{ name: "Revenue Growth (3Y)", value: "9.8%", score: 74 }, { name: "EPS Growth (3Y)", value: "18.2%", score: 82 }, { name: "FCF Growth (3Y)", value: "14.6%", score: 78 }] },
      profitability: { score: 82, label: "Profitability", topFactors: [{ name: "Net Margin", value: "18.4%", score: 80 }, { name: "ROE", value: "22.8%", score: 78 }, { name: "ROIC", value: "16.2%", score: 76 }] },
      health: { score: 88, label: "Health", topFactors: [{ name: "Current Ratio", value: "1.42", score: 78 }, { name: "Interest Coverage", value: "22.4x", score: 88 }, { name: "Altman Z-Score", value: "6.8", score: 92 }] },
      payout: { score: 68, label: "Payout", topFactors: [{ name: "Dividend Yield", value: "1.4%", score: 58 }, { name: "Payout Ratio", value: "42%", score: 72 }, { name: "Div Growth (5Y)", value: "6.8%", score: 68 }] },
    },
  },
};

const US_EXCHANGES = ["NYSE", "NASDAQ", "AMEX", "CBOE"];

const formatTicker = (ticker) => {
  const stock = STOCK_DB[ticker];
  if (!stock) return ticker;
  if (US_EXCHANGES.includes(stock.exchange)) return stock.ticker;
  return `${stock.exchange}:${stock.ticker}`;
};

// Resolve user input like "BME:TEF" or "TEF" to a DB key
const resolveTicker = (input) => {
  if (!input) return null;
  // Direct match (e.g. "AAPL")
  if (STOCK_DB[input]) return input;
  // Exchange:Ticker format (e.g. "BME:TEF")
  if (input.includes(":")) {
    const [exchange, ticker] = input.split(":");
    if (STOCK_DB[ticker] && STOCK_DB[ticker].exchange === exchange) return ticker;
  }
  return null;
};

// ── Tooltip (exact v3: header + pillar bar with peer marker + factor rows with value + mini colored bars) ──
function Tooltip({ pillar, position, color, comparePillar, compareTicker }) {
  if (!pillar) return null;
  const compareColor = BRAND.accent;
  return (
    <div style={{
      position: "absolute", left: position.x, top: position.y,
      transform: "translate(-50%, -100%) translateY(-12px)",
      background: "#1c2440",
      border: `1px solid ${color}40`,
      borderRadius: 10, padding: "12px 16px", minWidth: 220, zIndex: 50,
      pointerEvents: "none",
      boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.04)",
      animation: "tooltipIn 0.18s ease",
    }}>
      {/* Header: pillar name + scores */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ color: BRAND.textPrimary, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em" }}>{pillar.label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: comparePillar ? 8 : 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 1 }}>
              <span style={{ color, fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{pillar.score}</span>
              <span style={{ color: BRAND.textMuted, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>th</span>
            </div>
            <span style={{ color: BRAND.textMuted, fontSize: 8.5, fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>percentile</span>
          </div>
          {comparePillar && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", opacity: 0.7 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                <span style={{ color: compareColor, fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{comparePillar.score}</span>
                <span style={{ color: BRAND.textMuted, fontSize: 8, fontFamily: "'JetBrains Mono', monospace" }}>th</span>
              </div>
              <span style={{ color: compareColor, fontSize: 8, fontFamily: "'JetBrains Mono', monospace", marginTop: 1, opacity: 0.7 }}>{compareTicker}</span>
            </div>
          )}
        </div>
      </div>
      {/* Score bar with peer marker at 50% + compare marker */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginBottom: 10, overflow: "visible", position: "relative" }}>
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 1, height: 9, background: "rgba(255,255,255,0.25)", borderRadius: 1 }} />
        {comparePillar && (
          <div style={{ position: "absolute", left: `${comparePillar.score}%`, top: "50%", transform: "translate(-50%,-50%)", width: 5, height: 5, borderRadius: "50%", background: compareColor, opacity: 0.6, zIndex: 2 }} />
        )}
        <div style={{ height: "100%", width: `${pillar.score}%`, background: `linear-gradient(90deg, ${color}80, ${color})`, borderRadius: 2, position: "relative", zIndex: 1 }} />
      </div>
      {/* Factor rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {pillar.topFactors.map((f, i) => {
          const cf = comparePillar ? comparePillar.topFactors[i] : null;
          return (
            <div key={i}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: BRAND.textSecondary, fontSize: 11, flex: 1 }}>{f.name}</span>
                <span style={{ color: BRAND.textMuted, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>{f.value}</span>
                <div style={{ width: 24, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${f.score}%`, background: getScoreColor(f.score), borderRadius: 2 }} />
                </div>
              </div>
              {cf && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 2 }}>
                  <span style={{ color: compareColor, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", opacity: 0.6 }}>{cf.value}</span>
                  <div style={{ width: 24, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${cf.score}%`, background: compareColor, opacity: 0.5, borderRadius: 2 }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Ticker Chip (clean, no colored dot) ──
function TickerChip({ ticker, isActive, isEditable, isCustom, onSelect, onChange, onClear }) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  // Debounced search (simulate API delay)
  const handleInputChange = (val) => {
    setInputVal(val);
    setHighlightIdx(0);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (val.length === 0) { setSuggestions([]); setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(() => {
      const q = val.replace(":", "");
      const results = Object.values(STOCK_DB).filter((s) =>
        s.ticker.includes(q) || s.name.toUpperCase().includes(q) || `${s.exchange}:${s.ticker}`.includes(val)
      ).slice(0, 5);
      setSuggestions(results);
      setSearching(false);
    }, 400);
  };

  const selectSuggestion = (stock) => {
    const key = stock.ticker;
    onChange(key);
    setEditing(false);
    setInputVal("");
  };

  if (editing) {
    return (
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          value={inputVal}
          onChange={(e) => { handleInputChange(e.target.value.toUpperCase().replace(/[^A-Z:]/g, "")); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIdx((prev) => Math.min(prev + 1, suggestions.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIdx((prev) => Math.max(prev - 1, 0)); }
            else if (e.key === "Enter") {
              e.preventDefault();
              if (suggestions.length > 0) selectSuggestion(suggestions[highlightIdx]);
              else if (inputVal.trim()) { onChange(inputVal.trim()); setEditing(false); setInputVal(""); }
            }
            else if (e.key === "Escape") { setEditing(false); setInputVal(""); }
          }}
          onBlur={() => { setTimeout(() => { setEditing(false); setInputVal(""); setSuggestions([]); setSearching(false); }, 150); }}
          placeholder="TICKER"
          maxLength={12}
          style={{
            width: 80, background: "rgba(75,123,255,0.08)",
            border: `1px solid ${BRAND.accent}60`, color: BRAND.textPrimary,
            padding: "3px 8px", borderRadius: 6, fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
            outline: "none", textAlign: "center",
          }}
        />
        {(searching || suggestions.length > 0) && inputVal.length > 0 && (
          <div ref={dropdownRef} style={{
            position: "absolute", top: "calc(100% + 4px)", right: 0,
            background: "#1c2440", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, overflow: "hidden", zIndex: 100, minWidth: 180,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}>
            {searching ? (
              [0, 1, 2].map((i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", gap: 8 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <SkeletonPulse width={48 + i * 8} height={11} />
                    <SkeletonPulse width={80 + i * 12} height={9} />
                  </div>
                  <SkeletonPulse width={24} height={12} borderRadius={3} />
                </div>
              ))
            ) : suggestions.map((stock, i) => (
              <div
                key={stock.ticker}
                onMouseDown={(e) => { e.preventDefault(); selectSuggestion(stock); }}
                onMouseEnter={() => setHighlightIdx(i)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "6px 10px", cursor: "pointer",
                  background: i === highlightIdx ? "rgba(75,123,255,0.12)" : "transparent",
                  transition: "background 0.1s ease",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{
                    color: i === highlightIdx ? BRAND.accent : BRAND.textPrimary,
                    fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
                  }}>{formatTicker(stock.ticker)}</span>
                  <span style={{ color: BRAND.textMuted, fontSize: 9.5 }}>{stock.name}</span>
                </div>
                <span style={{
                  color: getScoreColor(stock.monkScore),
                  fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                }}>{stock.monkScore}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!ticker) {
    return (
      <button onClick={() => setEditing(true)} style={{
        background: "transparent", border: "1px dashed rgba(255,255,255,0.15)",
        color: BRAND.textMuted, padding: "3px 8px", borderRadius: 6,
        cursor: "pointer", fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 600, transition: "all 0.2s ease", minWidth: 36,
      }}
        onMouseEnter={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.3)"; e.target.style.color = BRAND.textSecondary; }}
        onMouseLeave={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.15)"; e.target.style.color = BRAND.textMuted; }}
      >+</button>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
      <button
        onClick={onSelect}
        onDoubleClick={() => { if (isEditable) { setEditing(true); setInputVal(ticker); } }}
        style={{
          background: isActive ? "rgba(75,123,255,0.12)" : "transparent",
          border: isActive ? `1px solid ${BRAND.accent}40` : "1px solid transparent",
          color: isActive ? BRAND.accent : BRAND.textMuted,
          padding: isCustom ? "3px 20px 3px 10px" : "3px 10px", borderRadius: 6, cursor: "pointer",
          fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
          transition: "all 0.2s ease",
        }}
      >{formatTicker(ticker)}{isActive && STOCK_DB[ticker] && (
        <span style={{ marginLeft: 4, color: getScoreColor(STOCK_DB[ticker].monkScore), fontWeight: 700 }}>{STOCK_DB[ticker].monkScore}</span>
      )}</button>
      {isCustom && onClear && (
        <span
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          style={{
            position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
            color: BRAND.textMuted, fontSize: 9, cursor: "pointer",
            lineHeight: 1, padding: "2px",
            transition: "color 0.2s ease",
          }}
          onMouseEnter={(e) => { e.target.style.color = BRAND.textSecondary; }}
          onMouseLeave={(e) => { e.target.style.color = BRAND.textMuted; }}
        >✕</span>
      )}
    </div>
  );
}

// ── Skeleton Shimmer ──
function SkeletonPulse({ width, height, borderRadius = 4, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius,
      background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s ease infinite",
      ...style,
    }} />
  );
}

function SkeletonState() {
  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  return (
    <div style={{
      width: "100%", maxWidth: 420,
      background: BRAND.cardBg, border: `1px solid ${BRAND.cardBorder}`,
      borderRadius: 16, padding: "20px 24px 24px",
    }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <SkeletonPulse width={90} height={12} />
        <div style={{ display: "flex", gap: 4 }}>
          <SkeletonPulse width={42} height={24} borderRadius={6} />
          <SkeletonPulse width={42} height={24} borderRadius={6} />
          <SkeletonPulse width={36} height={24} borderRadius={6} />
        </div>
      </div>
      {/* Score + Insight */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <SkeletonPulse width={56} height={36} borderRadius={6} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          <SkeletonPulse width={120} height={14} />
          <SkeletonPulse width={180} height={12} />
        </div>
      </div>
      {/* Snowflake skeleton */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
        <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", maxWidth: size, height: "auto" }}>
          {/* Faint grid rings */}
          {[0.25, 0.5, 0.75, 1].map((s) => (
            <circle key={s} cx={cx} cy={cy} r={radius * s} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
          ))}
          {/* Axes */}
          {[0, 1, 2, 3, 4].map((i) => {
            const angle = -Math.PI / 2 + (2 * Math.PI * i) / 5;
            return <line key={i} x1={cx} y1={cy} x2={cx + radius * Math.cos(angle)} y2={cy + radius * Math.sin(angle)} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />;
          })}
          {/* Pulsing placeholder shape */}
          <circle cx={cx} cy={cy} r={radius * 0.5} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.06)" strokeWidth="1">
            <animate attributeName="r" values={`${radius * 0.45};${radius * 0.55};${radius * 0.45}`} dur="2s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.04;0.08;0.04" dur="2s" repeatCount="indefinite" />
          </circle>
          {/* Label placeholders */}
          {[0, 1, 2, 3, 4].map((i) => {
            const angle = -Math.PI / 2 + (2 * Math.PI * i) / 5;
            const lx = cx + (radius + 26) * Math.cos(angle);
            const ly = cy + (radius + 26) * Math.sin(angle);
            return <rect key={i} x={lx - 18} y={ly - 6} width={36} height={12} rx={3} fill="rgba(255,255,255,0.04)">
              <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.5s" repeatCount="indefinite" begin={`${i * 0.15}s`} />
            </rect>;
          })}
        </svg>
      </div>
      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
        <SkeletonPulse width={80} height={10} />
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2, 3, 4].map((i) => <SkeletonPulse key={i} width={28} height={10} borderRadius={4} />)}
        </div>
      </div>
    </div>
  );
}

// ── Main ──
export default function MonkScoreSnowflake() {
  const pageStock = "AAPL";
  const pageData = STOCK_DB[pageStock];

  const [loading, setLoading] = useState(true);

  const [peer1, setPeer1] = useState(pageData.peers[0]);
  const [peer2, setPeer2] = useState(pageData.peers[1]);
  const [customTicker, setCustomTicker] = useState(null);
  const [activePeer, setActivePeer] = useState(null); // which peer ghost is showing
  const [hoveredPillar, setHoveredPillar] = useState(null);
  const [animProgress, setAnimProgress] = useState(0);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [notFound, setNotFound] = useState(null);
  const containerRef = useRef(null);
  const cardRef = useRef(null);

  const exportPNG = async () => {
    if (!cardRef.current) return;
    try {
      const mod = await import("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.esm.js");
      const html2canvas = mod.default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: BRAND.cardBg, scale: 2, useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `MonkScore-${formatTicker(pageStock)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch(e) {
      // Fallback: copy SVG to clipboard or alert
      console.error("Export failed:", e);
    }
  };

  // Main shape is always the page stock
  const data = pageData;
  const overallColor = getOverallColor(data.monkScore);
  const insightParts = getInsightParts(data.monkScore);

  // Peer ghost overlay
  const [peerLoading, setPeerLoading] = useState(false);
  const [loadedPeerData, setLoadedPeerData] = useState(null);

  const showCompare = activePeer && loadedPeerData;
  const compareData = loadedPeerData;

  const togglePeer = (ticker) => {
    if (activePeer === ticker) {
      setActivePeer(null);
      setLoadedPeerData(null);
    } else {
      setActivePeer(ticker);
      setPeerLoading(true);
      setLoadedPeerData(null);
      // Simulate API fetch (replace with real call in production)
      setTimeout(() => {
        setLoadedPeerData(STOCK_DB[ticker] || null);
        setPeerLoading(false);
      }, 800);
    }
  };

  useEffect(() => {
    setAnimProgress(0);
    setHoveredPillar(null);
    const start = performance.now();
    const dur = 700;
    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      setAnimProgress(1 - Math.pow(1 - t, 4));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (notFound) { const t = setTimeout(() => setNotFound(null), 3000); return () => clearTimeout(t); }
  }, [notFound]);

  const handleTickerChange = (setter, input) => {
    const resolved = resolveTicker(input);
    if (resolved) {
      setter(resolved);
      setActivePeer(resolved);
      setPeerLoading(true);
      setLoadedPeerData(null);
      setNotFound(null);
      setTimeout(() => {
        setLoadedPeerData(STOCK_DB[resolved] || null);
        setPeerLoading(false);
      }, 800);
    }
    else setNotFound(input);
  };

  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 120;

  const animatedScores = {};
  PILLAR_KEYS.forEach((k) => { animatedScores[k] = data.pillars[k].score * animProgress; });

  const compareScores = compareData ? {} : null;
  if (compareData) PILLAR_KEYS.forEach((k) => { compareScores[k] = compareData.pillars[k].score; });

  const gridLevels = [25, 50, 75, 100];

  const handlePillarHover = useCallback((key, event) => {
    if (key && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const clientY = event.touches ? event.touches[0].clientY : event.clientY;
      setTooltipPos({ x: clientX - rect.left, y: clientY - rect.top });
    }
    setHoveredPillar(key);
  }, []);

  const handlePillarTap = useCallback((key, event) => {
    event.preventDefault();
    event.stopPropagation();
    if (hoveredPillar === key) {
      setHoveredPillar(null);
    } else if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const clientY = event.touches ? event.touches[0].clientY : event.clientY;
      setTooltipPos({ x: clientX - rect.left, y: clientY - rect.top });
      setHoveredPillar(key);
    }
  }, [hoveredPillar]);

  // Simulate API load (remove in production, wire to actual API)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <div style={{
        background: BRAND.bg, minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Inter', -apple-system, sans-serif", padding: 20,
      }}>
        <SkeletonState />
      </div>
    );
  }

  return (
    <div style={{
      background: BRAND.bg, minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', -apple-system, sans-serif", padding: 20,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes tooltipIn {
          from { opacity: 0; transform: translate(-50%, -100%) translateY(-6px); }
          to { opacity: 1; transform: translate(-50%, -100%) translateY(-12px); }
        }
        @keyframes fadeInOut {
          0% { opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div ref={(el) => { containerRef.current = el; cardRef.current = el; }} onClick={() => setHoveredPillar(null)} style={{
        position: "relative", width: "100%", maxWidth: 420,
        background: BRAND.cardBg, border: `1px solid ${BRAND.cardBorder}`,
        borderRadius: 16, padding: "20px 24px 24px",
      }}>

        {/* Header + Chips */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ color: BRAND.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>MonkScore™</span>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <TickerChip ticker={peer1} isActive={activePeer === peer1} isEditable
                onSelect={() => togglePeer(peer1)}
                onChange={(t) => handleTickerChange(setPeer1, t)} />
              <TickerChip ticker={peer2} isActive={activePeer === peer2} isEditable
                onSelect={() => togglePeer(peer2)}
                onChange={(t) => handleTickerChange(setPeer2, t)} />
              <TickerChip ticker={customTicker} isActive={activePeer === customTicker} isEditable isCustom
                onSelect={() => customTicker && togglePeer(customTicker)}
                onChange={(t) => handleTickerChange(setCustomTicker, t)}
                onClear={() => { setCustomTicker(null); if (activePeer === customTicker) setActivePeer(null); }} />
            </div>
            <div
              onClick={(e) => { e.stopPropagation(); exportPNG(); }}
              style={{
                width: 26, height: 26, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                background: "rgba(255,255,255,0.08)",
                transition: "background 0.2s ease",
                marginRight: -8,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              title="Export as PNG"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke={BRAND.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Not found toast */}
        {notFound && (
          <div style={{
            position: "absolute", top: 52, right: 24,
            background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 8, padding: "6px 12px",
            color: BRAND.red, fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
            animation: "fadeInOut 3s ease forwards", zIndex: 10,
          }}>{notFound} not found</div>
        )}

        {/* Score + Insight */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <span style={{
              color: overallColor, fontSize: 36, fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, letterSpacing: "-0.02em",
              display: "block",
            }}>{Math.round(data.monkScore * animProgress)}<span style={{ fontSize: 14, color: BRAND.textMuted, fontWeight: 600 }}>th</span></span>
            <span style={{ display: "block", textAlign: "center", color: BRAND.textMuted, fontSize: 8, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: -2 }}>percentile</span>
            <div style={{
              position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
              marginTop: 4, display: "flex", gap: 4, whiteSpace: "nowrap",
            }}>
              {data.prevMonkScore != null && (() => {
                const delta = data.monkScore - data.prevMonkScore;
                if (delta === 0) return null;
                const isUp = delta > 0;
                const pillColor = isUp ? BRAND.green : BRAND.red;
                return (
                  <span
                    title={`${data.prevMonkScore} → ${data.monkScore} since last quarter`}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 3,
                      background: `${pillColor}15`,
                      border: `1px solid ${pillColor}30`,
                      borderRadius: 20, padding: "2px 7px",
                      color: pillColor,
                      fontSize: 9, fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      lineHeight: 1, cursor: "default",
                    }}>
                    {isUp ? "▲" : "▼"} {Math.abs(delta)} pts
                  </span>
                );
              })()}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minHeight: 50, paddingTop: 3 }}>
            <span style={{ color: BRAND.textPrimary, fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{data.name}</span>
            <span style={{ color: BRAND.textSecondary, fontSize: 12, lineHeight: 1.2 }}>
              <span style={{ color: overallColor, fontWeight: 600 }}>{insightParts.colored}</span>
              <span>{insightParts.rest}</span>
            </span>
            {(() => {
              if (peerLoading) {
                return (
                  <span style={{ fontSize: 12, color: BRAND.accent, lineHeight: 1.2, opacity: 0.6, transition: "opacity 0.3s ease" }}>
                    Loading {formatTicker(activePeer)}…
                  </span>
                );
              }
              const diff = showCompare ? data.monkScore - compareData.monkScore : 0;
              const absDiff = Math.abs(diff);
              let phrase = "As likely as";
              if (showCompare) {
                if (absDiff <= 5) phrase = "As likely as";
                else if (diff > 15) phrase = "Much more likely than";
                else if (diff > 0) phrase = "More likely than";
                else if (diff < -15) phrase = "Much less likely than";
                else phrase = "Less likely than";
              }
              return (
                <span style={{ fontSize: 12, color: BRAND.textSecondary, lineHeight: 1.2, opacity: showCompare ? 1 : 0, transition: "opacity 0.3s ease" }}>
                  <span style={{ color: BRAND.accent, fontWeight: 600 }}>{phrase}</span>
                  <span> {showCompare ? formatTicker(activePeer) : "PEER"} to beat</span>
                </span>
              );
            })()}
          </div>
        </div>

        {/* Snowflake */}
        <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
          <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", maxWidth: size, height: "auto", overflow: "visible" }}>
            <defs>
              <radialGradient id="sf" cx="50%" cy="50%" r="55%">
                <stop offset="0%" stopColor={overallColor} stopOpacity="0.20" />
                <stop offset="75%" stopColor={overallColor} stopOpacity="0.06" />
                <stop offset="100%" stopColor={overallColor} stopOpacity="0.01" />
              </radialGradient>
              <radialGradient id="og" cx="50%" cy="50%" r="50%">
                <stop offset="70%" stopColor={overallColor} stopOpacity="0.04" />
                <stop offset="100%" stopColor={overallColor} stopOpacity="0" />
              </radialGradient>
              <filter id="lg">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="dg">
                <feGaussianBlur stdDeviation="4" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            <circle cx={cx} cy={cy} r={radius + 25} fill="url(#og)" />

            {/* Grid */}
            {gridLevels.map((level) => {
              const gs = {}; PILLAR_KEYS.forEach((k) => (gs[k] = level));
              const isPeer = level === 50;
              return (
                <path key={level} d={getSmoothPath(gs, cx, cy, radius)}
                  fill="none"
                  stroke={isPeer ? "rgba(255,255,255,0.22)" : level === 100 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)"}
                  strokeWidth={isPeer ? 2 : 0.5}
                  strokeLinecap={isPeer ? "round" : "butt"}
                  strokeDasharray={isPeer ? "0,8" : "none"}
                />
              );
            })}

            {/* Peer Avg label */}
            {(() => {
              const angle = ANGLE_OFFSET + (2 * Math.PI * 1.5) / 5;
              const r = (50 / 100) * radius;
              return <text x={cx + r * Math.cos(angle) + 4} y={cy + r * Math.sin(angle) - 4}
                fill="rgba(255,255,255,0.20)" fontSize="7.5" fontFamily="'Inter', sans-serif" fontWeight="500" letterSpacing="0.03em">Peer Avg</text>;
            })()}

            {/* Axes */}
            {PILLAR_KEYS.map((key, i) => {
              const pt = getPoint(i, 100, 100, cx, cy, radius);
              return <line key={key} x1={cx} y1={cy} x2={pt.x} y2={pt.y}
                stroke={hoveredPillar === key ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)"}
                strokeWidth={0.5} style={{ transition: "stroke 0.3s ease" }} />;
            })}

            {/* Peer loading indicator */}
            {peerLoading && (
              <g>
                <circle cx={cx} cy={cy} r={radius * 0.3} fill="none" stroke={BRAND.accent} strokeWidth="1.5" opacity="0.15">
                  <animate attributeName="r" values={`${radius * 0.2};${radius * 0.5};${radius * 0.2}`} dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.2;0;0.2" dur="1.2s" repeatCount="indefinite" />
                </circle>
                <circle cx={cx} cy={cy} r={radius * 0.15} fill="none" stroke={BRAND.accent} strokeWidth="1" opacity="0.1">
                  <animate attributeName="r" values={`${radius * 0.1};${radius * 0.35};${radius * 0.1}`} dur="1.2s" repeatCount="indefinite" begin="0.3s" />
                  <animate attributeName="opacity" values="0.15;0;0.15" dur="1.2s" repeatCount="indefinite" begin="0.3s" />
                </circle>
              </g>
            )}

            {/* Compare ghost shape — solid line with breathing glow + vertex dots */}
            {showCompare && (
              <>
                {/* Soft pulsing glow layer */}
                <path d={getSmoothPath(compareScores, cx, cy, radius)}
                  fill="none"
                  stroke={BRAND.accent}
                  strokeWidth="6"
                  strokeLinejoin="round"
                  style={{ transition: "d 0.5s ease" }}
                >
                  <animate attributeName="stroke-opacity" values="0.04;0.15;0.04" dur="3s" repeatCount="indefinite" />
                </path>
                {/* Crisp solid line that breathes */}
                <path d={getSmoothPath(compareScores, cx, cy, radius)}
                  fill="none"
                  stroke={BRAND.accent}
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                  style={{ transition: "d 0.5s ease" }}
                >
                  <animate attributeName="stroke-opacity" values="0.25;0.5;0.25" dur="3s" repeatCount="indefinite" />
                </path>
                {/* Vertex dots */}
                {PILLAR_KEYS.map((key, i) => {
                  const pt = getPoint(i, compareData.pillars[key].score, 100, cx, cy, radius);
                  return (
                    <circle key={key} cx={pt.x} cy={pt.y} r="3" fill={BRAND.accent}>
                      <animate attributeName="opacity" values="0.3;0.65;0.3" dur="3s" repeatCount="indefinite" />
                    </circle>
                  );
                })}
                {/* Label on the ghost shape — between Health and Payout axes */}
                {(() => {
                  const angle = ANGLE_OFFSET + (2 * Math.PI * 3.5) / 5;
                  const avgScore = (compareData.pillars.health.score + compareData.pillars.payout.score) / 2;
                  const r = (avgScore / 100) * radius;
                  return <text x={cx + r * Math.cos(angle) - 4} y={cy + r * Math.sin(angle) + 4}
                    fill={BRAND.accent} fillOpacity="0.5" fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fontWeight="500"
                    textAnchor="end" letterSpacing="0.03em">{formatTicker(activePeer)}</text>;
                })()}
              </>
            )}

            {/* Main shape */}
            <path d={getSmoothPath(animatedScores, cx, cy, radius)}
              fill="url(#sf)" stroke={overallColor} strokeWidth="2"
              strokeLinejoin="round" filter="url(#lg)"
              style={{ transition: "d 0.5s cubic-bezier(0.34, 1.2, 0.64, 1)" }}
            />

            {/* Vertices */}
            {PILLAR_KEYS.map((key, i) => {
              const score = data.pillars[key].score * animProgress;
              const pt = getPoint(i, score, 100, cx, cy, radius);
              const labelPt = getPoint(i, 118, 100, cx, cy, radius);
              const isActive = hoveredPillar === key;
              const color = getScoreColor(data.pillars[key].score);

              return (
                <g key={key} style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => handlePillarHover(key, e)}
                  onMouseMove={(e) => {
                    if (containerRef.current) {
                      const rect = containerRef.current.getBoundingClientRect();
                      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }
                  }}
                  onMouseLeave={() => handlePillarHover(null)}
                  onClick={(e) => handlePillarTap(key, e)}
                >
                  <circle cx={labelPt.x} cy={labelPt.y} r={26} fill="transparent" />

                  {isActive && (
                    <circle cx={pt.x} cy={pt.y} r="5" fill="none" stroke={color} strokeWidth="1.5" opacity="0">
                      <animate attributeName="r" from="5" to="15" dur="1s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.5" to="0" dur="1s" repeatCount="indefinite" />
                    </circle>
                  )}

                  <circle cx={pt.x} cy={pt.y} r={isActive ? 5 : 3.5} fill={color}
                    filter={isActive ? "url(#dg)" : undefined}
                    style={{ transition: "r 0.25s ease" }} />

                  <text x={labelPt.x} y={labelPt.y - 6} textAnchor="middle"
                    fill={isActive ? BRAND.textPrimary : BRAND.textMuted}
                    fontSize="9.5" fontFamily="'Inter', sans-serif" fontWeight="600"
                    letterSpacing="0.05em"
                    style={{ transition: "fill 0.2s ease", textTransform: "uppercase" }}
                  >{data.pillars[key].label}</text>

                  <text x={labelPt.x} y={labelPt.y + 7} textAnchor="middle"
                    fill={isActive ? color : BRAND.textSecondary}
                    fontSize="12" fontFamily="'JetBrains Mono', monospace" fontWeight="700"
                    style={{ transition: "fill 0.2s ease" }}
                  >{Math.round(data.pillars[key].score * animProgress)}<tspan fontSize="7" fill={BRAND.textMuted}>th</tspan></text>
                </g>
              );
            })}

            {/* Compare legend moved to footer */}
          </svg>
        </div>

        {hoveredPillar && (
          <Tooltip
            pillar={data.pillars[hoveredPillar]}
            position={tooltipPos}
            color={getScoreColor(data.pillars[hoveredPillar].score)}
            comparePillar={showCompare ? compareData.pillars[hoveredPillar] : null}
            compareTicker={showCompare ? formatTicker(activePeer) : null}
          />
        )}

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          marginTop: 4, padding: "0 4px",
        }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: showCompare ? 1 : 0, transition: "opacity 0.3s ease" }}>
                <svg width="18" height="8" viewBox="0 0 18 8" fill="none">
                  <line x1="0" y1="4" x2="14" y2="4" stroke={BRAND.accent} strokeWidth="1.2" opacity="0.5" />
                  <circle cx="16" cy="4" r="2" fill={BRAND.accent} opacity="0.5" />
                </svg>
                <span style={{ color: BRAND.accent, opacity: 0.6, fontSize: 10.5, fontFamily: "'Inter', sans-serif" }}>
                  {activePeer && STOCK_DB[activePeer] ? STOCK_DB[activePeer].name : "Comparison"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="18" height="8" viewBox="0 0 18 8" fill="none">
                  <circle cx="3" cy="4" r="1.2" fill="rgba(255,255,255,0.5)" />
                  <circle cx="9" cy="4" r="1.2" fill="rgba(255,255,255,0.5)" />
                  <circle cx="15" cy="4" r="1.2" fill="rgba(255,255,255,0.5)" />
                </svg>
                <span style={{ color: BRAND.textMuted, fontSize: 10.5 }}>Peer average</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {[
              { c: BRAND.greenBright, l: "80+" },
              { c: BRAND.green, l: "60+" },
              { c: BRAND.yellow, l: "40+" },
              { c: BRAND.orange, l: "20+" },
              { c: BRAND.red, l: "<20" },
            ].map((item) => (
              <div key={item.l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.c, opacity: 0.75 }} />
                <span style={{ color: BRAND.textMuted, fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>{item.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Branding + Date */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, padding: "0 4px" }}>
          <span style={{ color: BRAND.textMuted, fontSize: 9, opacity: 0.6 }}>As of Feb 19, 2026</span>
          <span style={{ color: BRAND.textMuted, fontSize: 9, fontFamily: "'Inter', sans-serif", opacity: 0.6 }}>MonkStreet · www.monk.st</span>
        </div>
      </div>
    </div>
  );
}
