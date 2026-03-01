import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarProps {
  activeMonthISO: string;
}

const CalendarView: React.FC<CalendarProps> = ({ activeMonthISO }) => {
  const [year, month] = activeMonthISO.split("-");
  const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long' });

  // Generate 35 static cells (7 columns * 5 rows)
  const cells = Array.from({ length: 35 }, (_, i) => i + 1);

  return (
    <div className="calendar-container">
      <header className="calendar-nav">
        <button className="nav-arrow"><ChevronLeft size={24} /></button>
        <div className="month-display">
          <h2>{monthName} {year}</h2>
          <p className="subtitle">6 entries • Predominantly <span className="calm-highlight">Calm</span></p>
        </div>
        <button className="nav-arrow"><ChevronRight size={24} /></button>
      </header>

      <div className="calendar-grid">
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(day => (
          <div key={day} className="grid-label">{day}</div>
        ))}
        {cells.map(cell => (
          <div key={cell} className="grid-cell">
            <span className="cell-num">{cell <= 28 ? cell : ""}</span>
            {/* Logic for friend's floating dots would go here */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarView;