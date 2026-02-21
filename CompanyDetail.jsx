// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Company Detail — Responsive Masonry Layout                                ║
// ║                                                                            ║
// ║  Composes all MonkStreet analysis widgets into a single adaptive page.      ║
// ║  Cards reflow via CSS Grid masonry-like behavior across breakpoints:        ║
// ║    Mobile  (<640px)   → 1 column, full width                               ║
// ║    Tablet  (640-1024) → 2 columns                                          ║
// ║    Desktop (>1024)    → 2 columns with smart spanning                      ║
// ║                                                                            ║
// ║  Factor Detail is a second-level modal opened by clicking a ratio          ║
// ║  inside the Pillar Breakdown card.                                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { useState } from "react";
import { BRAND, GLOBAL_KEYFRAMES } from "./design-tokens.js";
import MonkScoreRadar from "./MonkScoreRadar.jsx";
import PillarBreakdown from "./PillarBreakdown.jsx";
import MonkScoreEvolution from "./MonkScoreEvolution.jsx";
import PriceForecast from "./PriceForecast.jsx";
import FactorDetailModal from "./FactorDetailModal.jsx";

// ── Mock factor data for modal (maps pillar+factor click to modal content) ────

const FACTOR_DETAIL_MAP = {
  "Net Margin": {
    name: "Net Margin", pillar: "profitability",
    value: "25.3%", numericValue: 25.3, score: 93, percentile: 93,
    prevValue: 22.8, prevPeriod: "Q2'24", dataType: "TTM", avg3Y: 25.0,
    definition: "The percentage of revenue that becomes profit after all expenses.",
    formula: {
      label: "Net Income ÷ Revenue",
      numerator: { label: "Net Income", value: "$96.2B" },
      denominator: { label: "Revenue", value: "$380.1B" },
      result: "25.3%",
      insight: "Apple keeps $25.30 of every $100 in revenue.",
    },
    company: "AAPL", companyName: "Apple Inc.",
    evolution: [
      { period: "Q1'21", value: 23.5 }, { period: "Q2'21", value: 21.7 },
      { period: "Q3'21", value: 25.9 }, { period: "Q4'21", value: 27.9 },
      { period: "Q1'22", value: 26.7 }, { period: "Q2'22", value: 23.4 },
      { period: "Q3'22", value: 25.3 }, { period: "Q4'22", value: 28.1 },
      { period: "Q1'23", value: 24.6 }, { period: "Q2'23", value: 22.2 },
      { period: "Q3'23", value: 26.3 }, { period: "Q4'23", value: 28.4 },
      { period: "Q1'24", value: 23.8 }, { period: "Q2'24", value: 22.8 },
      { period: "Q3'24", value: 25.0 }, { period: "Q4'24", value: 24.3 },
      { period: "Q1'25", value: 24.1 }, { period: "Q2'25", value: 25.3 },
    ],
    peers: [
      { ticker: "MSFT", name: "Microsoft", value: 36.4 },
      { ticker: "AAPL", name: "Apple", value: 25.3, isCompany: true },
      { ticker: "GOOG", name: "Alphabet", value: 22.1 },
      { ticker: "META", name: "Meta", value: 20.8 },
      { ticker: "AMZN", name: "Amazon", value: 9.2 },
    ],
    sectorMedian: 12.4,
  },
};

// Generic fallback for factors not in the detail map
function buildFactorData(pillarKey, factor) {
  if (FACTOR_DETAIL_MAP[factor.name]) {
    return FACTOR_DETAIL_MAP[factor.name];
  }
  // Generate a reasonable detail from the factor row data
  return {
    name: factor.name,
    pillar: pillarKey,
    value: factor.value,
    numericValue: parseFloat(factor.value) || 0,
    score: factor.score,
    percentile: factor.score,
    prevValue: factor.hist ? parseFloat(factor.hist) : null,
    prevPeriod: "3Y avg",
    dataType: "TTM",
    avg3Y: factor.hist ? parseFloat(factor.hist) : null,
    definition: `${factor.name} measures a key aspect of the company's ${pillarKey} profile.`,
    formula: null,
    company: "AAPL",
    companyName: "Apple Inc.",
    evolution: [
      { period: "Q1'23", value: (parseFloat(factor.value) || 50) * 0.92 },
      { period: "Q2'23", value: (parseFloat(factor.value) || 50) * 0.94 },
      { period: "Q3'23", value: (parseFloat(factor.value) || 50) * 0.96 },
      { period: "Q4'23", value: (parseFloat(factor.value) || 50) * 0.97 },
      { period: "Q1'24", value: (parseFloat(factor.value) || 50) * 0.95 },
      { period: "Q2'24", value: (parseFloat(factor.value) || 50) * 0.98 },
      { period: "Q3'24", value: (parseFloat(factor.value) || 50) * 0.99 },
      { period: "Q4'24", value: parseFloat(factor.value) || 50 },
    ],
    peers: [
      { ticker: "AAPL", name: "Apple", value: parseFloat(factor.value) || 0, isCompany: true },
      { ticker: "MSFT", name: "Microsoft", value: (parseFloat(factor.value) || 50) * 1.1 },
      { ticker: "GOOG", name: "Alphabet", value: (parseFloat(factor.value) || 50) * 0.9 },
    ],
    sectorMedian: (parseFloat(factor.value) || 50) * 0.7,
  };
}

// ── Responsive masonry CSS ──────────────────────────────────────────────────────

const MASONRY_CSS = `
  .ms-masonry {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    align-items: start;
  }

  /* Tablet: 2 columns */
  @media (min-width: 640px) {
    .ms-masonry {
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
  }

  /* Desktop: 2 columns, wider gaps */
  @media (min-width: 1024px) {
    .ms-masonry {
      gap: 24px;
    }
  }

  /* Card cells — adapt to container */
  .ms-cell {
    min-width: 0;
    width: 100%;
  }

  /* Force pillar breakdown to span full width on tablet+ (it's the widest) */
  @media (min-width: 640px) {
    .ms-cell--wide {
      grid-column: span 2;
    }
  }

  /* On mobile, all cards are single column */
  @media (max-width: 639px) {
    .ms-cell--wide {
      grid-column: span 1;
    }
  }

  /* Smooth entrance for cards */
  .ms-cell {
    animation: msCardIn 0.4s ease both;
  }
  .ms-cell:nth-child(1) { animation-delay: 0.05s; }
  .ms-cell:nth-child(2) { animation-delay: 0.12s; }
  .ms-cell:nth-child(3) { animation-delay: 0.19s; }
  .ms-cell:nth-child(4) { animation-delay: 0.26s; }

  @keyframes msCardIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Page header */
  .ms-header {
    text-align: center;
    margin-bottom: 28px;
    padding: 0 16px;
  }
  .ms-header h1 {
    margin: 0 0 4px;
    font-size: 22px;
    font-weight: 700;
    color: ${BRAND.textPrimary};
    font-family: ${BRAND.fontSans};
    letter-spacing: -0.02em;
  }
  .ms-header p {
    margin: 0;
    font-size: 12px;
    color: ${BRAND.textMuted};
    font-family: ${BRAND.fontMono};
  }

  /* Page footer */
  .ms-footer {
    text-align: center;
    padding: 20px 16px 32px;
    font-size: 10px;
    color: ${BRAND.textMuted};
    font-family: ${BRAND.fontMono};
    opacity: 0.5;
  }
`;

// ── Main page component ─────────────────────────────────────────────────────────

export default function CompanyDetail() {
  const [factorModal, setFactorModal] = useState(null); // { data, loading }

  const handleFactorClick = ({ pillar, factor }) => {
    // Show loading state immediately
    setFactorModal({ data: null, loading: true });

    // Simulate API fetch delay, then show the factor detail
    setTimeout(() => {
      const data = buildFactorData(pillar, factor);
      setFactorModal({ data, loading: false });
    }, 800);
  };

  const handleModalClose = () => {
    setFactorModal(null);
  };

  return (
    <div style={{
      background: BRAND.bg,
      minHeight: "100vh",
      fontFamily: BRAND.fontSans,
      padding: "32px 20px 0",
    }}>
      {/* Global styles — injected once */}
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <style>{GLOBAL_KEYFRAMES}{MASONRY_CSS}</style>

      {/* Page header */}
      <div className="ms-header">
        <h1>Apple Inc.</h1>
        <p>NASDAQ:AAPL · MonkScore™ 82 · As of Feb 21, 2026</p>
      </div>

      {/* Masonry grid */}
      <div className="ms-masonry">

        {/* Row 1, Left: MonkScore Radar (compact, square-ish) */}
        <div className="ms-cell">
          <MonkScoreRadar />
        </div>

        {/* Row 1, Right: MonkScore Evolution (timeline) */}
        <div className="ms-cell">
          <MonkScoreEvolution />
        </div>

        {/* Row 2: Price Forecast (wide chart) */}
        <div className="ms-cell ms-cell--wide">
          <PriceForecast />
        </div>

        {/* Row 3: Pillar Breakdown (full width, detailed) */}
        <div className="ms-cell ms-cell--wide">
          <PillarBreakdown onFactorClick={handleFactorClick} />
        </div>
      </div>

      {/* Page footer */}
      <div className="ms-footer">
        MonkStreet · www.monk.st · Data for illustrative purposes only
      </div>

      {/* Second-level: Factor Detail Modal (opens on ratio click) */}
      {factorModal && (
        <FactorDetailModal
          data={factorModal.data}
          loading={factorModal.loading}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
