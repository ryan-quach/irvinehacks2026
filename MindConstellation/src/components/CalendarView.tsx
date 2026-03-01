import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarProps {
  activeMonthISO: string;
}

const CalendarView: React.FC<CalendarProps> = ({ activeMonthISO }) => {
  const [currentView, setCurrentView] = useState(activeMonthISO);
  const [yearStr, monthStr] = currentView.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);

  const changeMonth = (offset: number) => {
    const date = new Date(year, month - 1 + offset, 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, "0");
    setCurrentView(`${newYear}-${newMonth}`);
  };

  const monthName = new Date(year, month - 1).toLocaleString("default", { month: "long" });
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const totalCells = 42;
  const gridDays = Array.from({ length: totalCells }, (_, i) => {
    const dayNumber = i - firstDayOfMonth + 1;
    return dayNumber > 0 && dayNumber <= daysInMonth ? dayNumber : null;
  });

  return (
    <div className="calendar-container">
      <header className="calendar-nav">
        <button className="nav-arrow" onClick={() => changeMonth(-1)}>
          <ChevronLeft size={24} />
        </button>
        <div className="month-display">
          <h2>{monthName} {year}</h2>
          <p className="subtitle">
            6 entries • Predominantly <span className="calm-highlight">Calm</span>
          </p>
        </div>
        <button className="nav-arrow" onClick={() => changeMonth(1)}>
          <ChevronRight size={24} />
        </button>
      </header>

      <div className="calendar-grid">
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
          <div key={day} className="grid-label">{day}</div>
        ))}
        {gridDays.map((day, index) => (
          <div key={index} className="grid-cell">
            {day && <span className="cell-num">{day}</span>}
            {/* Logic for friend's floating dots would go here */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarView;