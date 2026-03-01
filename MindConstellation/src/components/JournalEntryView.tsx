import React, { useEffect, useState, useMemo } from "react";
import "./JournalEntryView.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOTION_COLORS: Record<string, string> = {
  happiness: "#4ECDC4",
  excitement: "#FFD700",
  calm: "#8a9a5b",
  anxiety: "#A892EE",
  stress: "#FF6B6B",
  sadness: "#5DADE2",
  anger: "#E74C3C",
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type JournalEntry = {
  id?: string;
  transcript: string;
  summary: string;
  primary_emotion: string;
  secondary_emotion: string;
  intensity: number;
  valence: number;
  arousal: number;
  themes: string[] | string;
  embedding: string;
  entry_date: string;
  created_at: string;
};

export type ScreenPoint = { x: number; y: number };

type Props = {
  open: boolean;
  entry: JournalEntry | null;
  color: string;
  origin: ScreenPoint;
  onClose: () => void;
  closeOnBackdrop?: boolean;
  allEntries?: any[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEntryDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function parseThemes(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return typeof raw === "string"
      ? raw.split(",").map((s: string) => s.trim())
      : [];
  }
}

// ─── TimeChart ────────────────────────────────────────────────────────────────

function TimeChart({
  entries,
  field,
  label,
  currentEntryId,
  onHover,
  onLeave,
}: {
  entries: any[];
  field: "valence" | "arousal";
  label: string;
  currentEntryId?: string;
  onHover: (entry: any, x: number, y: number) => void;
  onLeave: () => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="jev-chart">
        <span className="jev-chart-label">{label}</span>
        <div className="jev-chart-empty">No entries with this theme</div>
      </div>
    );
  }

  const W = 600;
  const H = 180;        // ← taller to fit date labels
  const PX = 36;
  const PY = 24;
  const PB = 40;         // extra bottom padding for dates

  const sorted = [...entries].sort(
    (a, b) =>
      new Date(a.entry_date + "T00:00:00").getTime() -
      new Date(b.entry_date + "T00:00:00").getTime()
  );

  const dates = sorted.map((e) =>
    new Date(e.entry_date + "T00:00:00").getTime()
  );
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const dateRange = maxDate - minDate || 86400000;

  const minVal = field === "valence" ? -1 : 0;
  const maxVal = 1;
  const midVal = (minVal + maxVal) / 2;

  const sx = (d: number) =>
    PX + ((d - minDate) / dateRange) * (W - 2 * PX);
  const sy = (v: number) =>
    PY + ((maxVal - v) / (maxVal - minVal)) * (H - PY - PB);

  const pathD = sorted
    .map(
      (e, i) =>
        `${i === 0 ? "M" : "L"} ${sx(dates[i])} ${sy(e[field] ?? 0)}`
    )
    .join(" ");

  // Decide which date labels to show (thin out if > 8 dots)
  const maxLabels = 8;
  const step = Math.ceil(sorted.length / maxLabels);

  return (
    <div className="jev-chart">
      <span className="jev-chart-label">{label}</span>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        <line
          x1={PX} y1={sy(maxVal)} x2={W - PX} y2={sy(maxVal)}
          stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"
        />
        <line
          x1={PX} y1={sy(midVal)} x2={W - PX} y2={sy(midVal)}
          stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"
          strokeDasharray="4 4"
        />
        <line
          x1={PX} y1={sy(minVal)} x2={W - PX} y2={sy(minVal)}
          stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"
        />

        {/* X axis baseline */}
        <line
          x1={PX} y1={H - PB + 10} x2={W - PX} y2={H - PB + 10}
          stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"
        />

        {/* Y labels */}
        <text x={6} y={sy(maxVal) + 4} fill="#444" fontSize="9">{maxVal}</text>
        <text x={6} y={sy(midVal) + 4} fill="#555" fontSize="9">{midVal}</text>
        <text x={6} y={sy(minVal) + 4} fill="#444" fontSize="9">{minVal}</text>

        {/* Connecting line */}
        {sorted.length > 1 && (
          <path
            d={pathD}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1.5"
          />
        )}

        {/* Dots + date labels */}
        {sorted.map((e, i) => {
          const isCurrent = e.id === currentEntryId;
          const cx = sx(dates[i]);
          const cy = sy(e[field] ?? 0);

          const showLabel = i % step === 0 || i === sorted.length - 1;

          const dateLabel = new Date(
            e.entry_date + "T00:00:00"
          ).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });

          return (
            <g key={e.id ?? i}>
              {/* Tick mark */}
              {showLabel && (
                <line
                  x1={cx} y1={H - PB + 6}
                  x2={cx} y2={H - PB + 14}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="0.5"
                />
              )}

              {/* Date label */}
              {showLabel && (
                <text
                  x={cx}
                  y={H - PB + 26}
                  fill="#444"
                  fontSize="8"
                  textAnchor="middle"
                >
                  {dateLabel}
                </text>
              )}

              {/* Dot */}
              <circle
                cx={cx}
                cy={cy}
                r={isCurrent ? 7 : 5}
                fill={EMOTION_COLORS[e.primary_emotion] || "#555"}
                stroke={isCurrent ? "#fff" : "none"}
                strokeWidth={isCurrent ? 2 : 0}
                style={{ cursor: "pointer" }}
                onMouseEnter={(ev) => onHover(e, ev.clientX, ev.clientY)}
                onMouseLeave={onLeave}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
// ─── Main Component ───────────────────────────────────────────────────────────

export default function JournalEntryView({
  open,
  entry,
  color,
  origin,
  onClose,
  closeOnBackdrop = false,
  allEntries = [],
}: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [phase, setPhase] = useState<
    "enter" | "filling" | "reveal" | "shown" | "exit" | "exit-shrink"
  >("enter");

  const [stickyEntry, setStickyEntry] = useState<JournalEntry | null>(null);
  const [stickyColor, setStickyColor] = useState(color);
  const [stickyOrigin, setStickyOrigin] = useState(origin);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    entry: any;
    x: number;
    y: number;
  } | null>(null);

  // ── Animation lifecycle (unchanged) ────────────────────────────────────────
  useEffect(() => {
    if (open && entry) {
      setStickyEntry(entry);
      setStickyColor(color);
      setStickyOrigin(origin);
      setIsMounted(true);
      setPhase("enter");

      // Auto-select first theme
      const themes = parseThemes(entry.themes);
      if (themes.length > 0) setSelectedTheme(themes[0]);

      const t1 = setTimeout(() => setPhase("filling"), 10);
      const t2 = setTimeout(() => setPhase("reveal"), 2000);
      const t3 = setTimeout(() => setPhase("shown"), 250);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }

    if (!open && isMounted) {
      setPhase("exit");
      const t1 = setTimeout(() => setPhase("exit-shrink"), 100);
      const t2 = setTimeout(() => {
        setIsMounted(false);
        setStickyEntry(null);
      }, 2000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [open, entry, color, origin, isMounted]);

  // ── ESC to close (unchanged) ───────────────────────────────────────────────
  useEffect(() => {
    if (!isMounted) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isMounted, onClose]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const themes = useMemo(
    () => parseThemes(stickyEntry?.themes),
    [stickyEntry?.themes]
  );

  const themeEntries = useMemo(() => {
    if (!selectedTheme) return stickyEntry ? [stickyEntry] : [];

    const filtered = allEntries.filter((e) =>
      parseThemes(e.themes).includes(selectedTheme)
    );

    // Ensure current entry is included even if allEntries is empty
    if (
      stickyEntry?.id &&
      !filtered.find((e) => e.id === stickyEntry.id)
    ) {
      filtered.push(stickyEntry);
    }

    return filtered;
  }, [selectedTheme, allEntries, stickyEntry]);

  if (!isMounted || !stickyEntry) return null;

  return (
    <div
      className={`jev-root jev-${phase}`}
      style={
        {
          "--jev-color": stickyColor,
          "--jev-ox": `${stickyOrigin.x}px`,
          "--jev-oy": `${stickyOrigin.y}px`,
        } as React.CSSProperties
      }
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Color flood (unchanged) ── */}
      <div
        className="jev-flood"
        onClick={() => closeOnBackdrop && onClose()}
      />

      {/* ── Content surface ── */}
      <div className="jev-surface">
        {/* Header (unchanged) */}
        <header className="jev-header">
          <button className="jev-back" onClick={onClose} aria-label="Back">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>

          <div className="jev-header-meta">
            <span className="jev-header-date">
              {formatEntryDate(stickyEntry.entry_date)}
            </span>
            <div className="jev-emotion-pills">
              <span
                className="jev-pill"
                style={{
                  color: stickyColor,
                  borderColor: `${stickyColor}66`,
                }}
              >
                {stickyEntry.primary_emotion}
              </span>
              {stickyEntry.secondary_emotion && (
                <span className="jev-pill jev-pill--ghost">
                  {stickyEntry.secondary_emotion}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* ── Body — single scrollable column ── */}
        <div className="jev-body">
          <section className="jev-content-section">
            <p className="jev-section-label">Summary</p>
            <p className="jev-summary">{stickyEntry.summary}</p>
          </section>

          <section className="jev-content-section">
            <p className="jev-section-label">Entry</p>
            <div className="jev-transcript">{stickyEntry.transcript}</div>
          </section>

          {themes.length > 0 && (
            <section className="jev-content-section">
              <p className="jev-section-label">Themes</p>
              <div className="jev-theme-buttons">
                {themes.map((theme) => (
                  <button
                    key={theme}
                    className={`jev-theme-btn ${
                      selectedTheme === theme ? "active" : ""
                    }`}
                    onClick={() => setSelectedTheme(theme)}
                  >
                    {theme.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </section>
          )}

          {selectedTheme && (
            <section className="jev-content-section jev-charts-section">
              <TimeChart
                entries={themeEntries}
                field="valence"
                label="VALENCE OVER TIME"
                currentEntryId={stickyEntry.id}
                onHover={(e, x, y) => setTooltip({ entry: e, x, y })}
                onLeave={() => setTooltip(null)}
              />
              <TimeChart
                entries={themeEntries}
                field="arousal"
                label="AROUSAL OVER TIME"
                currentEntryId={stickyEntry.id}
                onHover={(e, x, y) => setTooltip({ entry: e, x, y })}
                onLeave={() => setTooltip(null)}
              />
            </section>
          )}

          <div className="jev-content-section jev-meta-footer">
            <span className="jev-section-label">created</span>
            <span className="jev-mono">{stickyEntry.created_at}</span>
          </div>
        </div>
      </div>

      {/* ── Tooltip ── */}
      {tooltip && (
        <div
          className="jev-tooltip"
          style={{ left: tooltip.x + 16, top: tooltip.y - 16 }}
        >
          <p className="jev-tooltip-summary">{tooltip.entry?.summary}</p>
        </div>
      )}
    </div>
  );
}