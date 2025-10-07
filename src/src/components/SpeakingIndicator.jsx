// components/SpeakingIndicator.jsx
import React from "react";
import "../styles/SpeakingIndicator.css";

export default function SpeakingIndicator({
  isRecording,
  position = "top-right",
}) {
  if (!isRecording) return null;

  return (
    <div className={`speaking-indicator ${position}`}>
      <div className="speaking-dot">
        <div className="pulse-ring" />
        <div className="pulse-ring delay-1" />
        <div className="pulse-ring delay-2" />
      </div>
      <span className="speaking-text">🎤 Speaking</span>
    </div>
  );
}
