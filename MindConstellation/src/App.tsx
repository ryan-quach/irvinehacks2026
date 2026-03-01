import { useMemo, useState } from "react";
import TopBar from "./components/TopBar";
import GraphView from "./components/GraphView";
import RightPanel from "./components/RightPanel";
import LeftPanel from "./components/LeftPanel";
import "./App.css";

export type ViewMode = "sphere" | "month";

export type JournalNode = {
  id: string;
  dateISO: string; // "2026-02-28"
  emotion: "joy" | "sadness" | "anger" | "anxiety" | "calm";
  intensity: number; // 0..1
  snippet?: string;
};

function App() {
  // UI state
  const [mode, setMode] = useState<ViewMode>("sphere");
  const [rightOpen, setRightOpen] = useState(true); // start open for usability
  const [leftOpen, setLeftOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<JournalNode | null>(null);

  // Calendar state (month mode)
  const [activeMonthISO, setActiveMonthISO] = useState<string>(() => {
    // default to current month-ish; for hackathon you can hardcode
    return "2026-02";
  });

  // When a node is clicked in the graph
  const handleSelectNode = (node: JournalNode | null) => {
    setSelectedNode(node);
    setLeftOpen(Boolean(node)); // open left panel if something selected
  };

  // When calendar icon toggled
  const toggleMonthMode = () => {
    setMode((prev) => (prev === "sphere" ? "month" : "sphere"));
    setRightOpen(false);
    setLeftOpen(false);
  };

  // tweak these based on what it acutally looks like
  const LEFT_W = 320; 
  const RIGHT_W = 360;

  const centerStyle = useMemo(() => {
    const leftPad = leftOpen ? LEFT_W : 0;
    const rightPad = rightOpen ? RIGHT_W : 0;

    return {
      paddingLeft: leftPad,
      paddingRight: rightPad,
    } as React.CSSProperties;
  }, [leftOpen, rightOpen]);

  return (
    <div className="app-root">
      {/* Top bar */}
      <div className="app-topbar">
        <TopBar
          mode={mode}
          onToggleMode={toggleMonthMode}
          activeMonthISO={activeMonthISO}
          onMonthChange={setActiveMonthISO}
          rightOpen={rightOpen}
          onToggleRight={() => setRightOpen((v) => !v)}
        />
      </div>

      {/* Main content area (fills remaining height) */}
      <div className="app-main">
        {/* Center canvas (graph) */}
        <div className="app-center" style={centerStyle}>
          <GraphView
            mode={mode}
            activeMonthISO={activeMonthISO}
            selectedNodeId={selectedNode?.id ?? null}
            onSelectNode={handleSelectNode}
          />
        </div>

        {/* Left panel (slides in) */}
        <div
          className={`app-left ${leftOpen ? "open" : "closed"}`}
          style={{ width: LEFT_W }}
        >
          <LeftPanel
            open={leftOpen}
            node={selectedNode}
            onClose={() => {
              setLeftOpen(false);
              setSelectedNode(null);
            }}
          />
        </div>

        {/* Right panel (slides in) */}
        <div
          className={`app-right ${rightOpen ? "open" : "closed"}`}
          style={{ width: RIGHT_W }}
        >
          <RightPanel open={rightOpen} onClose={() => setRightOpen(false)} />
        </div>
      </div>
    </div>
  );
}

export default App;