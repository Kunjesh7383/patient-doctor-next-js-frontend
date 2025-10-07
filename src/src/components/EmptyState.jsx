// components/EmptyState.jsx
import React from "react";
import "../styles/EmptyState.css";

export default function EmptyState({ mode }) {
  const isPatient = mode === "patient" || mode === undefined;

  return (
    <div className="empty-state">
      <div className="empty-icon">{isPatient ? "💬" : "🩺"}</div>
      <h3>{isPatient ? "Start a conversation" : "Doctor Dashboard"}</h3>
      <p>
        {isPatient
          ? "Begin chatting with your doctor using voice or text messages"
          : "Patient messages will appear here with AI-powered suggestions"}
      </p>
      <div className="feature-grid">
        {(isPatient
          ? [
              { icon: "🎤", label: "Voice Messages" },
              { icon: "💬", label: "Text Chat" },
              { icon: "🩺", label: "Doctor Support" },
              { icon: "🔒", label: "Private & Secure" },
            ]
          : [
              { icon: "🎤", label: "Live Transcription" },
              { icon: "🤖", label: "AI Suggestions" },
              { icon: "🎯", label: "Text Highlighting" },
              { icon: "🔗", label: "Visual Connections" },
            ]
        ).map(({ icon, label }) => (
          <div key={label} className="feature-item">
            <span>{icon}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
