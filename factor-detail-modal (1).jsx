import { useState, useRef, useEffect, useCallback, useMemo } from "react";

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Design tokens (shared with pillar-cards.jsx)                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const BRAND = {
  bg: "#0f1525",
  cardBg: "#171e32",
  cardBgHover: "#1c2440",
  cardBorder: "rgba(255,255,255,0.06)",
  greenBright: "#22c55e",
  green: "#34d399",
  yellow: "#fbbf24",
  orange: "#f97316",
  red: "#ef4444",
  accent: "#4b7bff",
  textPrimary: "#f0f2f8",
  textSecondary: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.28)",
  fontMono: "'JetBrains Mono', monospace",
  fontSans: "'Inter', -apple-system, sans-serif",
};

const PILLAR_COLORS = {
  value: "#a5b4fc",
  growth: "#34d399",
  profitability: "#fcd34d",
  health: "#38bdf8",
  payout: "#f9a8d4",
};

const getScoreColor = (s) => {
  if (s >= 80) return BRAND.greenBright;
  if (s >= 60) return BRAND.green;
  if (s >= 40) return BRAND.yellow;
  if (s >= 20) return BRAND.orange;
  return BRAND.red;
};

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Mock data                                                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const MOCK_FACTOR = {
  name: "Net Margin",
  pillar: "profitability",
  value: "25.3%",
  numericValue: 25.3,
  score: 93,
  percentile: 93,
  prevValue: 22.8,
  prevPeriod: "Q2'24",
  dataType: "TTM",  // "TTM" | "Quarterly" | "Annual"
  avg3Y: 25.0,
  definition: "The percentage of revenue that becomes profit after all expenses. Higher means the company keeps more of every dollar it earns.",
  formula: {
    label: "Net Income ÷ Revenue",
    numerator: { label: "Net Income", value: "$96.2B" },
    denominator: { label: "Revenue", value: "$380.1B" },
    result: "25.3%",
    insight: "Apple keeps $25.30 of every $100 in revenue.",
  },
  company: "AAPL",
  companyName: "Apple Inc.",
  evolution: [
    { period: "Q1'21", value: 23.5 },
    { period: "Q2'21", value: 21.7 },
    { period: "Q3'21", value: 25.9 },
    { period: "Q4'21", value: 27.9 },
    { period: "Q1'22", value: 26.7 },
    { period: "Q2'22", value: 23.4 },
    { period: "Q3'22", value: 25.3 },
    { period: "Q4'22", value: 28.1 },
    { period: "Q1'23", value: 24.6 },
    { period: "Q2'23", value: 22.2 },
    { period: "Q3'23", value: 26.3 },
    { period: "Q4'23", value: 28.4 },
    { period: "Q1'24", value: 23.8 },
    { period: "Q2'24", value: 22.8 },
    { period: "Q3'24", value: 25.0 },
    { period: "Q4'24", value: 24.3 },
    { period: "Q1'25", value: 24.1 },
    { period: "Q2'25", value: 25.3 },
  ],
  peers: [
    { ticker: "MSFT", name: "Microsoft", value: 36.4 },
    { ticker: "AAPL", name: "Apple", value: 25.3, isCompany: true },
    { ticker: "GOOG", name: "Alphabet", value: 22.1 },
    { ticker: "META", name: "Meta", value: 20.8 },
    { ticker: "AMZN", name: "Amazon", value: 9.2 },
  ],
  sectorMedian: 12.4,
};

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Animated number counter                                                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function AnimatedValue({ value, duration = 800, delay = 200 }) {
  const [display, setDisplay] = useState("0");
  const numericMatch = String(value).match(/^([\d.]+)(.*)/);

  useEffect(() => {
    if (!numericMatch) { setDisplay(String(value)); return; }
    const target = parseFloat(numericMatch[1]);
    const unit = numericMatch[2];
    const start = performance.now() + delay;
    let raf;

    const tick = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = 1 - Math.pow(1 - t, 3);
      const current = target * eased;
      const decimals = numericMatch[1].includes(".") ? numericMatch[1].split(".")[1].length : 0;
      setDisplay(current.toFixed(decimals) + unit);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{display}</>;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Helpers                                                                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function FadeSection({ delay = 0, children, style = {} }) {
  return (
    <div style={{
      animation: `sectionFadeIn 0.4s ease ${delay}s both`,
      ...style,
    }}>{children}</div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 600, color: BRAND.textMuted,
      fontFamily: BRAND.fontMono, textTransform: "uppercase",
      letterSpacing: "0.08em", marginBottom: 8,
    }}>{children}</div>
  );
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Loading skeleton                                                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function SkeletonPulse({ width, height, radius = 4, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: "rgba(255,255,255,0.04)",
      animation: "skeletonPulse 1.5s ease-in-out infinite",
      ...style,
    }} />
  );
}

function ModalSkeleton() {
  return (
    <div style={{ padding: 20, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <SkeletonPulse width={60} height={16} />
        <SkeletonPulse width={32} height={16} />
      </div>
      <SkeletonPulse width={140} height={22} style={{ marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <SkeletonPulse width={70} height={28} />
        <SkeletonPulse width={120} height={14} style={{ marginTop: 8 }} />
      </div>
      <SkeletonPulse width="100%" height={140} radius={8} style={{ marginBottom: 24 }} />
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <SkeletonPulse width={38} height={14} />
          <SkeletonPulse width={`${70 - i * 10}%`} height={14} />
          <SkeletonPulse width={40} height={14} />
        </div>
      ))}
      <SkeletonPulse width="100%" height={44} radius={8} style={{ marginTop: 20 }} />
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Evolution chart — tooltip + line draw + area fade                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function EvolutionChart({ data, color, unit = "%", avg3Y, sectorMedian }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [pathLength, setPathLength] = useState(0);
  const pathRef = useRef(null);
  const svgRef = useRef(null);

  const values = data.map(d => d.value);
  const allValues = [...values, ...(avg3Y != null ? [avg3Y] : []), ...(sectorMedian != null ? [sectorMedian] : [])];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const pad = range * 0.15;
  const yMin = min - pad;
  const yMax = max + pad;

  const W = 420, H = 140;
  const PL = 40, PR = 12, PT = 16, PB = 28;
  const cw = W - PL - PR;
  const ch = H - PT - PB;

  const toX = (i) => PL + (i / (data.length - 1)) * cw;
  const toY = (v) => PT + (1 - (v - yMin) / (yMax - yMin)) * ch;

  const linePath = data.map((d, i) =>
    `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(d.value).toFixed(1)}`
  ).join(" ");

  const areaPath = linePath +
    ` L${toX(data.length - 1).toFixed(1)},${H - PB} L${PL},${H - PB} Z`;

  useEffect(() => {
    if (pathRef.current) setPathLength(pathRef.current.getTotalLength());
  }, []);

  const yTicks = 4;
  const yStep = (yMax - yMin) / yTicks;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => yMin + i * yStep);
  const xLabels = data.filter((_, i) => i % 4 === 0 || i === data.length - 1);

  const handleMouseMove = useCallback((e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((mouseX - PL) / cw) * (data.length - 1));
    setHoveredIdx(Math.max(0, Math.min(data.length - 1, idx)));
  }, [data.length]);

  const handleTouch = useCallback((e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const mouseX = ((touch.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((mouseX - PL) / cw) * (data.length - 1));
    setHoveredIdx(Math.max(0, Math.min(data.length - 1, idx)));
  }, [data.length]);

  const hovered = hoveredIdx !== null ? data[hoveredIdx] : null;
  const lastPt = data[data.length - 1];

  return (
    <div style={{ position: "relative", overflow: "hidden", padding: "20px 0 0" }}
      onMouseLeave={() => setHoveredIdx(null)}
      onTouchEnd={() => setHoveredIdx(null)}
    >
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", cursor: "crosshair", touchAction: "none", display: "block" }}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouch}
      >
        {/* Grid lines */}
        {yLabels.map((v, i) => (
          <g key={i}>
            <line x1={PL} x2={W - PR} y1={toY(v)} y2={toY(v)}
              stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <text x={PL - 6} y={toY(v) + 3.5}
              fill={BRAND.textMuted} fontSize="8" fontFamily={BRAND.fontMono}
              textAnchor="end">{v.toFixed(1)}{unit}</text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={`${color}10`}
          style={{ animation: "areaFadeIn 0.8s ease 0.6s both" }} />

        {/* 3Y average reference line */}
        {avg3Y != null && (
          <g style={{ animation: "areaFadeIn 0.6s ease 0.8s both" }}>
            <line x1={PL} x2={W - PR} y1={toY(avg3Y)} y2={toY(avg3Y)}
              stroke={color} strokeWidth="1.5" strokeDasharray="6,4" opacity="0.55" />
          </g>
        )}

        {/* Sector median reference line */}
        {sectorMedian != null && (
          <g style={{ animation: "areaFadeIn 0.6s ease 0.9s both" }}>
            <line x1={PL} x2={W - PR} y1={toY(sectorMedian)} y2={toY(sectorMedian)}
              stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeDasharray="3,4" />
          </g>
        )}

        {/* Line — draws in */}
        <path ref={pathRef} d={linePath} fill="none"
          stroke={color} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          style={{
            strokeDasharray: pathLength || 1000,
            strokeDashoffset: pathLength || 1000,
            animation: pathLength ? "lineDrawIn 1.2s ease 0.3s forwards" : "none",
          }}
        />

        {/* Hover crosshair + dot */}
        {hoveredIdx !== null && (
          <>
            <line x1={toX(hoveredIdx)} x2={toX(hoveredIdx)}
              y1={PT} y2={H - PB}
              stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3,2" />
            <circle cx={toX(hoveredIdx)} cy={toY(hovered.value)}
              r="4.5" fill={BRAND.cardBg} stroke={color} strokeWidth="2" />
          </>
        )}

        {/* End dot — pops in after line draws */}
        {hoveredIdx === null && (
          <g style={{ animation: "dotPopIn 0.3s ease 1.4s both" }}>
            <circle cx={toX(data.length - 1)} cy={toY(lastPt.value)}
              r="8" fill={color} opacity="0.12" />
            <circle cx={toX(data.length - 1)} cy={toY(lastPt.value)}
              r="3.5" fill={color} />
          </g>
        )}

        {/* X-axis labels */}
        {xLabels.map((d) => {
          const idx = data.indexOf(d);
          return (
            <text key={d.period} x={toX(idx)} y={H - 6}
              fill={hoveredIdx === idx ? BRAND.textSecondary : BRAND.textMuted}
              fontSize="7.5" fontFamily={BRAND.fontMono}
              textAnchor="middle">{d.period}</text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredIdx !== null && hovered && (() => {
        const leftPct = (toX(hoveredIdx) / W) * 100;
        const topPct = ((toY(hovered.value) - 8) / H) * 100;
        const nearTop = topPct < 15;
        const clampedLeft = Math.max(12, Math.min(88, leftPct));
        return (
          <div style={{
            position: "absolute",
            left: `${clampedLeft}%`,
            top: nearTop
              ? `calc(20px + ${((toY(hovered.value) + 14) / H) * 100}%)`
              : `calc(20px + ${topPct}%)`,
            transform: nearTop ? "translate(-50%, 0)" : "translate(-50%, -100%)",
            background: BRAND.cardBg,
            border: `1px solid ${color}30`,
            borderRadius: 6, padding: "5px 10px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            zIndex: 10,
          }}>
            <span style={{
              fontSize: 12, fontWeight: 600, color: BRAND.textPrimary,
              fontFamily: BRAND.fontMono,
            }}>{hovered.value}{unit}</span>
            <span style={{
              fontSize: 9, color: BRAND.textMuted, fontFamily: BRAND.fontMono,
              marginLeft: 7,
            }}>{hovered.period}</span>
          </div>
        );
      })()}

      {/* Legend */}
      {(avg3Y != null || sectorMedian != null) && (
        <div style={{
          display: "flex", gap: 16, padding: "6px 0 0 40px",
          animation: "sectionFadeIn 0.3s ease 0.9s both",
        }}>
          {avg3Y != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="20" height="2"><line x1="0" x2="20" y1="1" y2="1"
                stroke={color} strokeWidth="1.5" strokeDasharray="6,4" opacity="0.55" /></svg>
              <span style={{
                fontSize: 9, fontFamily: BRAND.fontMono, color: BRAND.textMuted,
              }}>3Y avg ({avg3Y}{unit})</span>
            </div>
          )}
          {sectorMedian != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="20" height="2"><line x1="0" x2="20" y1="1" y2="1"
                stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeDasharray="3,4" /></svg>
              <span style={{
                fontSize: 9, fontFamily: BRAND.fontMono, color: BRAND.textMuted,
              }}>Sector median ({sectorMedian}{unit})</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Peer comparison bars — staggered fill animation                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function PeerBars({ peers, sectorMedian, color, unit = "%" }) {
  const [animate, setAnimate] = useState(false);
  const sortedPeers = useMemo(() => [...peers].sort((a, b) => b.value - a.value), [peers]);
  const maxVal = Math.max(...sortedPeers.map(p => p.value), sectorMedian) * 1.1;

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {sortedPeers.map((p, i) => {
        const pct = (p.value / maxVal) * 100;
        return (
          <div key={p.ticker} style={{
            display: "flex", alignItems: "center", gap: 8,
            animation: `sectionFadeIn 0.3s ease ${0.06 * i}s both`,
            padding: "3px 4px", borderRadius: 4, marginLeft: -4, marginRight: -4,
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
            onMouseEnter={(e) => e.currentTarget.style.background = `${color}08`}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <span style={{
              width: 38, fontSize: 10.5, fontWeight: p.isCompany ? 700 : 400,
              fontFamily: BRAND.fontMono,
              color: p.isCompany ? BRAND.textPrimary : BRAND.textSecondary,
              textAlign: "right", flexShrink: 0,
            }}>{p.ticker}</span>
            <div style={{
              flex: 1, height: 16, background: "rgba(255,255,255,0.03)",
              borderRadius: 4, overflow: "hidden", position: "relative",
            }}>
              <div style={{
                width: animate ? `${pct}%` : "0%",
                height: "100%", borderRadius: 4,
                background: p.isCompany
                  ? `linear-gradient(90deg, ${color}80, ${color})`
                  : "rgba(255,255,255,0.07)",
                transition: `width 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 * i}s`,
              }} />
              {/* Sector median marker on company row */}
              {p.isCompany && (
                <div style={{
                  position: "absolute", top: -1, bottom: -1,
                  left: `${(sectorMedian / maxVal) * 100}%`,
                  borderLeft: "1.5px dashed rgba(255,255,255,0.25)",
                }} />
              )}
            </div>
            <span style={{
              fontSize: 10.5, fontWeight: p.isCompany ? 600 : 400,
              fontFamily: BRAND.fontMono, minWidth: 44, textAlign: "right",
              color: p.isCompany ? BRAND.textPrimary : BRAND.textSecondary,
            }}>{p.value}{unit}</span>
          </div>
        );
      })}
      {/* Sector median label */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginTop: 2, paddingTop: 6,
        borderTop: "1px dashed rgba(255,255,255,0.06)",
        animation: `sectionFadeIn 0.3s ease ${0.06 * sortedPeers.length}s both`,
      }}>
        <span style={{
          width: 38, fontSize: 9.5, fontFamily: BRAND.fontMono,
          color: BRAND.textMuted, textAlign: "right", flexShrink: 0,
        }}>Med</span>
        <div style={{
          flex: 1, height: 16, position: "relative",
        }}>
          <div style={{
            position: "absolute", top: 0, bottom: 0,
            left: `${(sectorMedian / maxVal) * 100}%`,
            borderLeft: "1.5px dashed rgba(255,255,255,0.2)",
          }} />
        </div>
        <span style={{
          fontSize: 9.5, fontFamily: BRAND.fontMono, minWidth: 44,
          textAlign: "right", color: BRAND.textMuted,
        }}>{sectorMedian}{unit}</span>
      </div>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Modal                                                                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function FactorDetailModal({ data, onClose, loading = false }) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const dragRef = useRef({ startY: 0, currentY: 0, dragging: false });
  const [copied, setCopied] = useState(false);
  const [chartPeriod, setChartPeriod] = useState("5Y");
  const color = PILLAR_COLORS[data?.pillar] || BRAND.accent;
  const scoreColor = data ? getScoreColor(data.score) : BRAND.textMuted;

  useEffect(() => {
    const handleKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Drag-to-dismiss handlers
  const handleDragStart = (e) => {
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    dragRef.current = { startY: y, currentY: y, dragging: true };
  };

  const handleDragMove = (e) => {
    if (!dragRef.current.dragging || !panelRef.current) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const dy = Math.max(0, y - dragRef.current.startY);
    dragRef.current.currentY = y;
    panelRef.current.style.transform = `translateY(${dy}px)`;
    panelRef.current.style.opacity = Math.max(0.5, 1 - dy / 400);
  };

  const handleDragEnd = () => {
    if (!dragRef.current.dragging || !panelRef.current) return;
    const dy = dragRef.current.currentY - dragRef.current.startY;
    dragRef.current.dragging = false;
    if (dy > 100) {
      panelRef.current.style.transition = "transform 0.2s ease, opacity 0.2s ease";
      panelRef.current.style.transform = "translateY(100%)";
      panelRef.current.style.opacity = "0";
      setTimeout(onClose, 200);
    } else {
      panelRef.current.style.transition = "transform 0.25s ease, opacity 0.25s ease";
      panelRef.current.style.transform = "translateY(0)";
      panelRef.current.style.opacity = "1";
      setTimeout(() => {
        if (panelRef.current) panelRef.current.style.transition = "";
      }, 250);
    }
  };

  return (
    <div ref={overlayRef} onClick={handleOverlayClick} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
      animation: "modalFadeIn 0.2s ease",
    }}>
      <div ref={panelRef} className="factor-modal-panel" style={{
        background: BRAND.cardBg,
        border: `1px solid ${BRAND.cardBorder}`,
        borderRadius: 16, width: "100%", maxWidth: 480,
        maxHeight: "85vh", overflowY: "auto", overflowX: "hidden",
        scrollbarWidth: "none", msOverflowStyle: "none",
        animation: "modalSlideUp 0.25s ease",
      }}>
        {loading || !data ? (
          <ModalSkeleton />
        ) : (
          <>
            {/* Mobile drag handle */}
            <div
              className="modal-drag-handle"
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              style={{
                display: "flex", justifyContent: "center", padding: "8px 0 0",
                cursor: "grab", touchAction: "none",
              }}
            >
              <div style={{
                width: 36, height: 4, borderRadius: 2,
                background: "rgba(255,255,255,0.12)",
              }} />
            </div>

            {/* ── Header ── */}
            <FadeSection delay={0} style={{
              padding: "12px 20px 14px",
              borderBottom: `1px solid ${BRAND.cardBorder}`,
            }}>
              {/* Top row: pillar badge + TTM + buttons */}
              <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                <span style={{
                  fontSize: 9, fontWeight: 600, color: color,
                  fontFamily: BRAND.fontMono, textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  padding: "2px 6px", borderRadius: 4,
                  background: `${color}12`, border: `1px solid ${color}20`,
                }}>{data.pillar}</span>
                <div style={{ flex: 1 }} />
                <div style={{ position: "relative" }}>
                  {/* Copied tooltip */}
                  {copied && (
                    <div style={{
                      position: "absolute", top: "100%", left: "50%",
                      transform: "translateX(-50%)",
                      marginTop: 4,
                      fontSize: 9, fontWeight: 600, fontFamily: BRAND.fontMono,
                      color: BRAND.greenBright, whiteSpace: "nowrap",
                      animation: "sectionFadeIn 0.15s ease",
                    }}>Copied!</div>
                  )}
                  <button onClick={() => {
                  const text = [
                    `${data.name} — ${data.companyName} (${data.company})`,
                    `Current: ${data.value} (${data.percentile}th percentile)${data.dataType ? ` [${data.dataType}]` : ""}`,
                    data.prevValue != null ? `YoY: ${data.numericValue >= data.prevValue ? "+" : ""}${(data.numericValue - data.prevValue).toFixed(1)} vs ${data.prevPeriod || "1Y ago"}` : "",
                    data.avg3Y != null ? `3Y avg: ${data.avg3Y}%` : "",
                    `Sector median: ${data.sectorMedian}%`,
                    "",
                    "Peers:",
                    ...data.peers.map(p => `  ${p.ticker}: ${p.value}%${p.isCompany ? " ←" : ""}`),
                    "",
                    `${data.companyName} (${data.company}) · ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · MonkStreet · www.monk.st`,
                  ].filter(Boolean).join("\n");
                  navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }} aria-label="Copy" className="modal-close-btn" style={{
                  width: 26, height: 26, borderRadius: 13,
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${BRAND.cardBorder}`,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s ease",
                }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                >
                  {copied ? (
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8.5L6.5 12L13 4" stroke={BRAND.greenBright} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                      <rect x="5" y="5" width="9" height="9" rx="1.5" stroke={BRAND.textMuted} strokeWidth="1.5" />
                      <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke={BRAND.textMuted} strokeWidth="1.5" />
                    </svg>
                  )}
                </button>
                </div>
                {/* Close button */}
                <button onClick={onClose} aria-label="Close" className="modal-close-btn" style={{
                  width: 26, height: 26, borderRadius: 13, marginLeft: 5,
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${BRAND.cardBorder}`,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s ease",
                }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2L10 10M10 2L2 10" stroke={BRAND.textMuted} strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Name + TTM — full width */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 4,
              }}>
                <span style={{
                  fontSize: 18, fontWeight: 700, color: BRAND.textPrimary,
                  fontFamily: BRAND.fontSans,
                }}>{data.name}</span>
                {data.dataType && (
                  <span style={{
                    fontSize: 8, fontWeight: 600, fontFamily: BRAND.fontMono,
                    color: BRAND.textMuted,
                    padding: "2px 5px", borderRadius: 3,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    letterSpacing: "0.04em",
                  }}>{data.dataType}</span>
                )}
              </div>

              {/* Two-column: insight left, value+pills right */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                {(data.formula?.insight || data.definition) && (
                  <div style={{
                    flex: 1, minWidth: 0,
                    fontSize: 11.5, color: BRAND.textSecondary,
                    fontFamily: BRAND.fontSans, lineHeight: 1.4,
                    paddingTop: 4,
                  }}>{data.formula?.insight || data.definition}</div>
                )}
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <div style={{
                    fontSize: 26, fontWeight: 700, fontFamily: BRAND.fontMono,
                    color: BRAND.textPrimary, lineHeight: 1,
                  }}>
                    <AnimatedValue value={data.value} duration={900} delay={200} />
                  </div>
                  <div style={{
                    marginTop: 6, display: "flex", alignItems: "center",
                    justifyContent: "flex-end", gap: 5,
                    animation: "sectionFadeIn 0.3s ease 0.4s both",
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, fontFamily: BRAND.fontMono, color: scoreColor,
                      padding: "2px 7px", borderRadius: 4,
                      background: `${scoreColor}12`, border: `1px solid ${scoreColor}20`,
                    }}>
                      P{data.percentile}
                    </span>
                    {data.prevValue != null && (() => {
                      const delta = data.numericValue - data.prevValue;
                      const up = delta >= 0;
                      const dColor = up ? BRAND.greenBright : BRAND.red;
                      return (
                        <span style={{
                          fontSize: 10, fontWeight: 600, fontFamily: BRAND.fontMono,
                          color: dColor,
                          padding: "2px 7px", borderRadius: 4,
                          background: `${dColor}12`, border: `1px solid ${dColor}20`,
                        }}>
                          {up ? "+" : ""}{delta.toFixed(1)} YoY
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </FadeSection>

            {/* ── Evolution ── */}
            <FadeSection delay={0.12} style={{ padding: "10px 20px 8px" }}>
              {/* Title + period switcher on same line */}
              <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                <span style={{
                  fontSize: 9, fontWeight: 600, color: BRAND.textMuted,
                  fontFamily: BRAND.fontMono, textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}>Evolution</span>
                <div style={{ flex: 1 }} />
                <div style={{
                  display: "flex", gap: 2, background: "rgba(255,255,255,0.03)",
                  borderRadius: 5, padding: 2,
                }}>
                  {["1Y", "3Y", "5Y", "All"].map(p => (
                    <button key={p} className="period-btn" onClick={() => setChartPeriod(p)} style={{
                      fontSize: 8.5, fontWeight: chartPeriod === p ? 600 : 400,
                      fontFamily: BRAND.fontMono,
                      color: chartPeriod === p ? BRAND.textPrimary : BRAND.textMuted,
                      background: chartPeriod === p ? "rgba(255,255,255,0.08)" : "transparent",
                      border: "none", borderRadius: 3,
                      padding: "3px 7px", cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}>{p}</button>
                  ))}
                </div>
              </div>
              <EvolutionChart
                key={chartPeriod}
                data={(() => {
                  if (!data.evolution) return [];
                  const len = data.evolution.length;
                  if (chartPeriod === "1Y") return data.evolution.slice(Math.max(0, len - 4));
                  if (chartPeriod === "3Y") return data.evolution.slice(Math.max(0, len - 12));
                  if (chartPeriod === "5Y") return data.evolution.slice(Math.max(0, len - 20));
                  return data.evolution;
                })()}
                color={color}
                avg3Y={data.avg3Y} sectorMedian={data.sectorMedian}
              />
            </FadeSection>

            {/* ── Peer comparison ── */}
            <FadeSection delay={0.28} style={{ padding: "8px 20px 12px" }}>
              <SectionLabel>Peer comparison</SectionLabel>
              <PeerBars
                peers={data.peers}
                sectorMedian={data.sectorMedian}
                color={color}
              />
            </FadeSection>

            {/* ── Footer ── */}
            <div style={{
              padding: "8px 20px 12px",
              borderTop: `1px solid ${BRAND.cardBorder}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{
                fontSize: 9, fontFamily: BRAND.fontMono, color: BRAND.textMuted,
                letterSpacing: "0.02em",
              }}>
                {data.companyName} ({data.company}) · {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span style={{
                fontSize: 9, fontFamily: BRAND.fontMono, color: BRAND.textMuted,
              }}>MonkStreet · www.monk.st</span>
            </div>

          </>
        )}
      </div>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Keyframes                                                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const KEYFRAMES = `
  @keyframes modalFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes modalSlideUp {
    from { opacity: 0; transform: translateY(16px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes sectionFadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes lineDrawIn {
    to { stroke-dashoffset: 0; }
  }
  @keyframes areaFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes dotPopIn {
    from { opacity: 0; transform-origin: center; transform: scale(0); }
    to { opacity: 1; transform-origin: center; transform: scale(1); }
  }
  @keyframes tooltipFadeIn {
    from { opacity: 0; transform: translate(-50%, -90%); }
    to { opacity: 1; transform: translate(-50%, -100%); }
  }
  @keyframes skeletonPulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }
  @media (max-width: 540px) {
    .factor-modal-panel {
      border-radius: 16px 16px 0 0 !important;
      max-width: 100% !important;
      align-self: flex-end !important;
      max-height: 75vh !important;
    }
  }
  .factor-modal-panel::-webkit-scrollbar {
    display: none;
  }
  .modal-close-btn:active {
    transform: scale(0.9);
    opacity: 0.8;
  }
  @media (min-width: 541px) {
    .modal-drag-handle { display: none !important; }
  }
  .period-btn:active {
    transform: scale(0.92);
    opacity: 0.8;
  }
`;

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Demo wrapper                                                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export default function FactorDetailDemo() {
  const [mode, setMode] = useState(null);

  const handleOpen = () => {
    setMode("loading");
    setTimeout(() => setMode("loaded"), 1200);
  };

  return (
    <div style={{
      background: BRAND.bg, minHeight: "100vh",
      fontFamily: BRAND.fontSans, padding: "40px 20px",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 16,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{KEYFRAMES}</style>

      <button onClick={handleOpen} style={{
        background: BRAND.cardBg, border: `1px solid ${BRAND.cardBorder}`,
        borderRadius: 10, padding: "14px 24px",
        cursor: "pointer", color: BRAND.textPrimary,
        fontFamily: BRAND.fontSans, fontSize: 13,
        display: "flex", alignItems: "center", gap: 10,
        transition: "all 0.15s ease",
      }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = BRAND.cardBgHover;
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = BRAND.cardBg;
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <div style={{ width: 4, height: 4, borderRadius: 2, background: BRAND.greenBright }} />
        <span style={{ fontWeight: 600 }}>Net Margin</span>
        <span style={{ fontFamily: BRAND.fontMono, color: BRAND.greenBright, fontWeight: 600 }}>25.3%</span>
        <span style={{ fontSize: 10, fontWeight: 600, fontFamily: BRAND.fontMono, color: BRAND.greenBright }}>93</span>
        <span style={{ fontSize: 9, color: BRAND.textMuted, fontFamily: BRAND.fontMono, marginLeft: 4 }}>← CLICK</span>
      </button>

      <p style={{
        color: BRAND.textMuted, fontSize: 11, fontFamily: BRAND.fontMono,
        textAlign: "center", maxWidth: 420, lineHeight: 1.6,
      }}>
        1.2s skeleton → sections stagger in → line draws → bars fill →
        numbers count up → hover for tooltip with crosshair
      </p>

      {mode && (
        <FactorDetailModal
          data={mode === "loaded" ? MOCK_FACTOR : null}
          loading={mode === "loading"}
          onClose={() => setMode(null)}
        />
      )}
    </div>
  );
}
