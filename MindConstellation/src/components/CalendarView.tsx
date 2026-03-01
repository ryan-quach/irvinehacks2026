import React, { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from '../utils/supabaseClient'; //
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
  const [dbEntries, setDbEntries] = useState<any[]>([]); //
  const [loading, setLoading] = useState(true); //

  // Journal overlay state
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [nodeColor, setNodeColor] = useState("#fff");
  const [clickOrigin, setClickOrigin] = useState<ScreenPoint>({ x: 0, y: 0 });

  // 1. Fetch live entries from Supabase
  useEffect(() => {
    const fetchCalendarData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*');

      if (error) {
        console.error("Supabase Error:", error);
      } else {
        setDbEntries(data || []);
      }
      setLoading(false);
    };

    fetchCalendarData();
  }, []);

  // Parse year/month
  const [yearStr, monthStr] = currentView.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);

  // 2. Group live entries by day
  const entriesByDay = useMemo(() => {
    const buckets: Record<number, any[]> = {};

    dbEntries.forEach((entry: any) => {
      if (!entry.entry_date) return;
      // Ensure date is treated as local to prevent timezone shifts
      const d = new Date(entry.entry_date + "T00:00:00");
      if (d.getFullYear() === year && d.getMonth() === month - 1) {
        const day = d.getDate();
        (buckets[day] ??= []).push(entry);
      }
    });

    return buckets;
  }, [year, month, dbEntries]);

  // Count entries + find dominant emotion for subtitle
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

  // Click handler for a dot
  const handleDotClick = (entry: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const color = EMOTION_COLORS[entry.primary_emotion] || "#fff";
    setClickOrigin({ x: e.clientX, y: e.clientY });
    setNodeColor(color);
    // Directly passing the entry as Supabase columns match the interface
    setSelectedEntry(entry as JournalEntry);
    setEntryOpen(true);
  };

  if (loading) {
    return (
      <div className="calendar-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#666' }}>
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
              {totalEntries} {totalEntries === 1 ? "entry" : "entries"} •
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
                        backgroundColor: EMOTION_COLORS[entry.primary_emotion] || "#555",
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
        closeOnBackdrop
      />
    </div>
  );
};

export default CalendarView;