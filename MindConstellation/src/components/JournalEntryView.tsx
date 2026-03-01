{/* <JournalEntryView
        open={open}
        entry={entry}
        color={nodeColor}
        origin={origin}
        onClose={() => setOpen(false)}
        closeOnBackdrop={false}
      />  */}
// example usage of JournalEntryView ^

import React, { useEffect, useState } from "react";
import "./JournalEntryView.css";

// ─── Types ────────────────────────────────────────────────────────────────────

export type JournalEntry = {
  transcript: string;
  summary: string;
  primary_emotion: string;
  secondary_emotion: string;
  intensity: number;
  valence: number;
  arousal: number;
  themes: string[];
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
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function formatEntryDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── Affect Map ───────────────────────────────────────────────────────────────

function AffectMap({
  valence,
  arousal,
  color,
}: {
  valence: number;
  arousal: number;
  color: string;
}) {
  const x = clamp01((valence + 1) / 2);
  const y = clamp01(1 - arousal);

  return (
    <div className="jev-affect-wrap">
      <div className="jev-affect-ylabels">
        <span>active</span>
        <span>calm</span>
      </div>
      <div className="jev-affect-right">
        <div className="jev-affect-map">
          <div className="jev-affect-axis jev-affect-axis--h" />
          <div className="jev-affect-axis jev-affect-axis--v" />
          <div
            className="jev-affect-dot"
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              background: color,
              boxShadow: `0 0 0 5px ${color}28`,
            }}
          />
        </div>
        <div className="jev-affect-xlabels">
          <span>unpleasant</span>
          <span>pleasant</span>
        </div>
      </div>
    </div>
  );
}

// ─── Intensity Bar ────────────────────────────────────────────────────────────

function IntensityBar({ value, color }: { value: number; color: string }) {
  const v = clamp01(value);
  return (
    <div className="jev-intensity-row">
      <div className="jev-bar-track">
        <div
          className="jev-bar-fill"
          style={{ width: `${v * 100}%`, background: color }}
        />
      </div>
      <span className="jev-bar-value">{Math.round(v * 100)}</span>
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
}: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [phase, setPhase] = useState<
    "enter" | "filling" | "reveal" | "shown" | "exit" | "exit-shrink"
    >("enter");

  const [stickyEntry, setStickyEntry] = useState<JournalEntry | null>(null);
  const [stickyColor, setStickyColor] = useState(color);
  const [stickyOrigin, setStickyOrigin] = useState(origin);

  // ── Animation lifecycle ────────────────────────────────────────────────────
  useEffect(() => {
    if (open && entry) {
      setStickyEntry(entry);
      setStickyColor(color);
      setStickyOrigin(origin);
      setIsMounted(true);
      setPhase("enter");

      // 1) kick off the color flood
      const t1 = setTimeout(() => setPhase("filling"), 10);
      // 2) once flood has settled to black, fade content in
      const t2 = setTimeout(() => setPhase("reveal"), 2000);
      // 3) done
      const t3 = setTimeout(() => setPhase("shown"), 250);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }

    if (!open && isMounted) {
        setPhase("exit");                                           // content fades out
        const t1 = setTimeout(() => setPhase("exit-shrink"), 100);  // flood reverses
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

  // ── ESC to close ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isMounted) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isMounted, onClose]);

  if (!isMounted || !stickyEntry) return null;

  const intensity = clamp01(stickyEntry.intensity);
  const arousal = clamp01(stickyEntry.arousal);
  const valence = Math.max(-1, Math.min(1, stickyEntry.valence));

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
      {/* ── Color flood — expands from click point, fades node-color → black ── */}
      <div
        className="jev-flood"
        onClick={() => closeOnBackdrop && onClose()}
      />

      {/* ── Content surface — fades in once flood settles ── */}
      <div className="jev-surface">
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

        <div className="jev-body">
          {/* LEFT — transcript */}
          <section className="jev-col-transcript">
            <p className="jev-section-label">Entry</p>
            <div className="jev-transcript">{stickyEntry.transcript}</div>
          </section>

          {/* RIGHT — insights */}
          <aside className="jev-col-insights">
            <div className="jev-insight-block">
              <p className="jev-section-label">Summary</p>
              <p className="jev-summary">{stickyEntry.summary}</p>
            </div>

            <div className="jev-insight-block">
              <p className="jev-section-label">Affect space</p>
              <AffectMap
                valence={valence}
                arousal={arousal}
                color={stickyColor}
              />
            </div>

            <div className="jev-insight-block">
              <p className="jev-section-label">Intensity</p>
              <IntensityBar value={intensity} color={stickyColor} />
            </div>

            {stickyEntry.themes?.length > 0 && (
              <div className="jev-insight-block">
                <p className="jev-section-label">Themes</p>
                <div className="jev-chips">
                  {stickyEntry.themes.map((theme) => (
                    <span key={theme} className="jev-chip">
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="jev-insight-block jev-insight-block--meta">
              <span className="jev-section-label">created</span>
              <span className="jev-mono">{stickyEntry.created_at}</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}