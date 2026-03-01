import { useState, useEffect } from "react";
import GraphView from "./components/GraphView";
import CalendarView from "./components/CalendarView";
import VoiceOverlay from "./components/VoiceOverlay";
import "./App.css";

export type ViewMode = "sphere" | "month";

export type JournalNode = {
  id: string;
  dateISO: string;
  emotion: "joy" | "sadness" | "anger" | "anxiety" | "calm";
  intensity: number;
  snippet?: string;
};

function App() {
  const [mode, setMode] = useState<ViewMode>("sphere");
  const [activeMonthISO, setActiveMonthISO] = useState("2026-02");
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsRecording((prev) => !prev);
      } 
      else if (e.code === "Escape") {
        setIsRecording(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="app-root">
      {/* The Iris Transition Overlay */}
      <VoiceOverlay isActive={isRecording} />

      <header className="app-header">
        <h1 className="logo">
          <span className="logo-bold">Mind</span> Constellation
        </h1>
      </header>

      <main className="app-main">
        {/* Wrap the graph in a container that fills the main area */}
        <div style={{ 
          display: mode === "sphere" ? "block" : "none", 
          width: '100%', 
          height: '100%' 
        }}>
          <GraphView isVisible={mode === "sphere"} />
        </div>

        <div style={{ 
          display: mode === "month" ? "flex" : "none", 
          width: '100%', 
          height: '100%' 
        }}>
          <CalendarView activeMonthISO={activeMonthISO} />
        </div>
      </main>

      <footer className="app-footer">
        <button 
          className="icon-btn toggle-view" 
          onClick={() => setMode(mode === "sphere" ? "month" : "sphere")}
        >
          {mode === "sphere" ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          )}
        </button>
      </footer>
    </div>
  );
}

export default App;