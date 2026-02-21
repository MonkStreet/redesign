// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Shared Design Tokens — MonkStreet Company Detail                          ║
// ║  Single source of truth for colors, typography, score utilities,           ║
// ║  pillar definitions, and global keyframes.                                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// ── Brand palette ──────────────────────────────────────────────────────────────

export const BRAND = {
  bg:            "#0f1525",
  cardBg:        "#171e32",
  cardBgHover:   "#1c2440",
  cardBorder:    "rgba(255,255,255,0.06)",
  accent:        "#4b7bff",
  greenBright:   "#22c55e",
  green:         "#34d399",
  yellow:        "#fbbf24",
  orange:        "#f97316",
  red:           "#ef4444",
  textPrimary:   "#f0f2f8",
  textSecondary: "rgba(255,255,255,0.55)",
  textMuted:     "rgba(255,255,255,0.28)",
  fontMono:      "'JetBrains Mono', monospace",
  fontSans:      "'Inter', -apple-system, sans-serif",
};

// ── Pillar definitions ─────────────────────────────────────────────────────────

export const PILLAR_KEYS = ["value", "growth", "profitability", "health", "payout"];

export const PILLAR_COLORS = {
  value:         "#a5b4fc",
  growth:        "#34d399",
  profitability: "#fcd34d",
  health:        "#38bdf8",
  payout:        "#f9a8d4",
};

export const PILLAR_LABELS = {
  value:         "Value",
  growth:        "Growth",
  profitability: "Profitability",
  health:        "Health",
  payout:        "Payout",
};

// ── Score utilities ────────────────────────────────────────────────────────────

export const getScoreColor = (score) => {
  if (score >= 80) return BRAND.greenBright;
  if (score >= 60) return BRAND.green;
  if (score >= 40) return BRAND.yellow;
  if (score >= 20) return BRAND.orange;
  return BRAND.red;
};

export const SCORE_BANDS = [
  { min: 80, max: 100, color: BRAND.greenBright },
  { min: 60, max: 80,  color: BRAND.green },
  { min: 40, max: 60,  color: BRAND.yellow },
  { min: 20, max: 40,  color: BRAND.orange },
  { min: 0,  max: 20,  color: BRAND.red },
];

// ── Shared helpers ─────────────────────────────────────────────────────────────

export const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

// ── Skeleton shimmer component (reused across all cards) ───────────────────────

export function SkeletonPulse({ width, height, borderRadius = 4, style = {} }) {
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

// ── Card wrapper style (shared across all first-level cards) ───────────────────

export const cardStyle = {
  background: BRAND.cardBg,
  border: `1px solid ${BRAND.cardBorder}`,
  borderRadius: 16,
  overflow: "hidden",
  width: "100%",
};

// ── Global keyframes (injected once at the page level) ─────────────────────────

export const GLOBAL_KEYFRAMES = `
  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes rowFadeIn {
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes lineDrawIn {
    from { stroke-dashoffset: var(--pathlen, 4000); }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes areaFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes coneFadeIn {
    from { opacity: 0; clip-path: inset(0 100% 0 0); }
    to   { opacity: 1; clip-path: inset(0 0% 0 0); }
  }
  @keyframes dotPop {
    0%   { transform: scale(0); opacity: 0; }
    70%  { transform: scale(1.4); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes dotPopIn {
    from { opacity: 0; transform-origin: center; transform: scale(0); }
    to   { opacity: 1; transform-origin: center; transform: scale(1); }
  }
  @keyframes stripIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes dotRowIn {
    from { opacity: 0; transform: scaleX(0.75); }
    to   { opacity: 1; transform: scaleX(1); }
  }
  @keyframes popoverIn {
    from { opacity: 0; transform: translateY(4px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes pinnedFade {
    0%   { opacity: 1; }
    60%  { opacity: 1; }
    100% { opacity: 0; }
  }
  @keyframes skeletonPulse {
    0%, 100% { opacity: 0.4; }
    50%      { opacity: 0.8; }
  }
  @keyframes tooltipIn {
    from { opacity: 0; transform: translate(-50%, -100%) translateY(-6px); }
    to   { opacity: 1; transform: translate(-50%, -100%) translateY(-12px); }
  }
  @keyframes fadeInOut {
    0% { opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes skeletonLine {
    0%   { stroke-dashoffset: 800; }
    100% { stroke-dashoffset: 0; }
  }
  @keyframes modalFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes modalSlideUp {
    from { opacity: 0; transform: translateY(16px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes sectionFadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Shared interactive states */
  .pillar-row-btn:active {
    opacity: 0.85;
    transform: scale(0.995);
  }
  .factor-row:hover .factor-name {
    text-decoration: underline;
    text-decoration-color: rgba(255,255,255,0.2);
    text-underline-offset: 2px;
  }
  .fan-period-btn:active { transform: scale(0.92); }
  .fan-meth-btn:hover { opacity: 1 !important; }
  .period-btn:active { transform: scale(0.92); opacity: 0.8; }
  .modal-close-btn:active { transform: scale(0.9); opacity: 0.8; }

  /* Factor modal responsive */
  @media (max-width: 540px) {
    .factor-modal-panel {
      border-radius: 16px 16px 0 0 !important;
      max-width: 100% !important;
      align-self: flex-end !important;
      max-height: 75vh !important;
    }
    .pillar-oneliner {
      padding-left: 25px !important;
      font-size: 11.5px !important;
    }
    .factor-hist, .factor-header-hist {
      display: none !important;
    }
  }
  @media (min-width: 541px) {
    .modal-drag-handle { display: none !important; }
  }
  .factor-modal-panel::-webkit-scrollbar { display: none; }
`;
