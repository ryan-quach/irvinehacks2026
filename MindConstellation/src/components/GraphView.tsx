const GraphView = ({ mode }: { mode: string }) => {
  return (
    <div className="graph-placeholder">
      {/* Your friend's constellation logic will go here */}
      <div className="status-indicator">
        Displaying: {mode.toUpperCase()} MODE
      </div>
    </div>
  );
};

export default GraphView;