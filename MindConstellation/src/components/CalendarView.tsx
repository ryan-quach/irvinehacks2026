import React, { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import JournalEntryView, {
  type JournalEntry,
  type ScreenPoint,
} from "./JournalEntryView";
import "./CalendarView.css";

const EMOTION_COLORS: Record<string, string> = {
  happiness: "#4ECDC4",
  excitement: "#FFD700",
  calm: "#8a9a5b",
  anxiety: "#A892EE",
  stress: "#FF6B6B",
  sadness: "#5DADE2",
  anger: "#E74C3C",
};

interface CalendarProps {
  activeMonthISO: string;
}

const CalendarView: React.FC<CalendarProps> = ({ activeMonthISO }) => {
  const [currentView, setCurrentView] = useState(activeMonthISO);
  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Journal overlay state
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [nodeColor, setNodeColor] = useState("#fff");
  const [clickOrigin, setClickOrigin] = useState<ScreenPoint>({ x: 0, y: 0 });

  // ── Fetch entries + derive full themes from theme_embeddings ──────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [entriesRes, embeddingsRes] = await Promise.all([
        supabase.from("journal_entries").select("*"),
        supabase.from("theme_embeddings").select("journal_id, theme"),
      ]);

      if (entriesRes.error || embeddingsRes.error) {
        console.error(
          "Supabase Error:",
          entriesRes.error || embeddingsRes.error
        );
        setLoading(false);
        return;
      }

      // Build a map of journal_id → unique themes[]
      const themesByJournal = new Map<string, Set<string>>();
      (embeddingsRes.data || []).forEach((row: any) => {
        if (!themesByJournal.has(row.journal_id)) {
          themesByJournal.set(row.journal_id, new Set());
        }
        themesByJournal.get(row.journal_id)!.add(row.theme);
      });

      // Override themes on each entry with the full list
      const enriched = (entriesRes.data || []).map((entry: any) => ({
        ...entry,
        themes: Array.from(themesByJournal.get(entry.id) ?? []),
      }));

      setAllEntries(enriched);
      setLoading(false);
    };

    fetchData();
  }, []);

  // Parse year/month
  const [yearStr, monthStr] = currentView.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);

  // Group entries by day for the current month
  const entriesByDay = useMemo(() => {
    const buckets: Record<number, any[]> = {};

    allEntries.forEach((entry: any) => {
      if (!entry.entry_date) return;
      const d = new Date(entry.entry_date + "T00:00:00");
      if (d.getFullYear() === year && d.getMonth() === month - 1) {
        const day = d.getDate();
        (buckets[day] ??= []).push(entry);
      }
    });

    return buckets;
  }, [year, month, allEntries]);

  // Count entries + dominant emotion for subtitle
  const { totalEntries, dominantEmotion } = useMemo(() => {
    const all = Object.values(entriesByDay).flat();
    const counts: Record<string, number> = {};
    all.forEach((e: any) => {
      counts[e.primary_emotion] = (counts[e.primary_emotion] || 0) + 1;
    });
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return {
      totalEntries: all.length,
      dominantEmotion: dominant ? dominant[0] : null,
    };
  }, [entriesByDay]);

  // Calendar math
  const changeMonth = (offset: number) => {
    const date = new Date(year, month - 1 + offset, 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, "0");
    setCurrentView(`${newYear}-${newMonth}`);
  };

  const monthName = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
  });
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells = 42;

  const gridDays = Array.from({ length: totalCells }, (_, i) => {
    const dayNumber = i - firstDayOfMonth + 1;
    return dayNumber > 0 && dayNumber <= daysInMonth ? dayNumber : null;
  });

  // Click handler
  const handleDotClick = (entry: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const color = EMOTION_COLORS[entry.primary_emotion] || "#fff";
    setClickOrigin({ x: e.clientX, y: e.clientY });
    setNodeColor(color);
    setSelectedEntry(entry as JournalEntry);
    setEntryOpen(true);
  };

  if (loading) {
    return (
      <div
        className="calendar-container"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#666",
        }}
      >
        Loading Constellation Data...
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <header className="calendar-nav">
        <button className="nav-arrow" onClick={() => changeMonth(-1)}>
          <ChevronLeft size={24} />
        </button>
        <div className="month-display">
          <h2>
            {monthName} {year}
          </h2>
          {totalEntries > 0 && dominantEmotion && (
            <p className="subtitle">
              {totalEntries} {totalEntries === 1 ? "entry" : "entries"} ·
              Predominantly{" "}
              <span style={{ color: EMOTION_COLORS[dominantEmotion] }}>
                {dominantEmotion}
              </span>
            </p>
          )}
        </div>
        <button className="nav-arrow" onClick={() => changeMonth(1)}>
          <ChevronRight size={24} />
        </button>
      </header>

      <div className="calendar-grid">
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
          <div key={day} className="grid-label">
            {day}
          </div>
        ))}

        {gridDays.map((day, index) => {
          const entries = day ? entriesByDay[day] ?? [] : [];

          return (
            <div key={index} className="grid-cell">
              {day && <span className="cell-num">{day}</span>}
              {entries.length > 0 && (
                <div className="cell-dots">
                  {entries.map((entry: any, i: number) => (
                    <button
                      key={entry.id ?? i}
                      className="entry-dot"
                      style={{
                        backgroundColor:
                          EMOTION_COLORS[entry.primary_emotion] || "#555",
                        width: `${24 + (entry.intensity ?? 0.5) * 12}px`,
                        height: `${24 + (entry.intensity ?? 0.5) * 12}px`,
                      }}
                      onClick={(e) => handleDotClick(entry, e)}
                      title={`${entry.primary_emotion} — ${entry.summary?.slice(0, 60) ?? ""}`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <JournalEntryView
        open={entryOpen}
        entry={selectedEntry}
        color={nodeColor}
        origin={clickOrigin}
        onClose={() => setEntryOpen(false)}
        closeOnBackdrop={false}
        allEntries={allEntries}
      />
    </div>
  );
};

export default CalendarView;