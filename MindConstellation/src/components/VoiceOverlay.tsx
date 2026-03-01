import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic } from "lucide-react";

interface VoiceOverlayProps {
  isActive: boolean;
}

const VoiceOverlay: React.FC<VoiceOverlayProps> = ({ isActive }) => {
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setIsListening(false);
    }
  }, [isActive]);

  return (
    <motion.div 
      className="voice-overlay"
      initial={{ clipPath: "circle(0% at 50% 50%)", opacity: 0 }}
      animate={{ 
        clipPath: isActive ? "circle(150% at 50% 50%)" : "circle(0% at 50% 50%)",
        opacity: isActive ? 1 : 0
      }}
      style={{
        pointerEvents: isActive ? "all" : "none",
        visibility: "visible", // Keep visible so the "closing" animation can be seen
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        backgroundColor: "#050505",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}
      transition={{ 
        duration: 0.8, 
        ease: [0.76, 0, 0.24, 1] // This specific cubic-bezier mimics a camera iris
      }}
    >
      <div className="voice-content" style={{ textAlign: 'center' }}>
        <motion.button 
          className={`mic-circle ${isListening ? 'active-mic' : ''}`}
          onClick={() => setIsListening(!isListening)}
          animate={isListening ? { scale: [1, 1.1, 1] } : { scale: 1 }}
          transition={{ repeat: isListening ? Infinity : 0, duration: 1.5 }}
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <Mic size={48} color={isListening ? "#ff4b4b" : "#ffffff"} />
        </motion.button>
        
        <p style={{ 
          marginTop: '24px', 
          color: '#666', 
          letterSpacing: '2px', 
          fontSize: '0.9rem',
          fontWeight: 500 
        }}>
          {isListening ? "RECORDING..." : "CLICK MIC TO START"}
        </p>

        <p style={{ 
          marginTop: '60px', 
          fontSize: '0.65rem', 
          color: '#333', 
          letterSpacing: '1px' 
        }}>
          PRESS SPACE TO EXIT
        </p>
      </div>
    </motion.div>
  );
};

export default VoiceOverlay;