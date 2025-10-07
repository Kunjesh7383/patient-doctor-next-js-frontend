// components/MessageBubble.jsx
import React from "react";
import "../styles/MessageBubble.css";

export default function MessageBubble({ message, isOwn, mode }) {
  const isUser = message.role === "user" || message.sender === "patient";
  const isDoctor = message.role === "doctor" || message.sender === "doctor";

  return (
    <div className={`message-container ${isOwn ? "own" : "other"}`}>
      <div className={`avatar ${isUser ? "patient" : "doctor"}`}>
        {isUser ? "👤" : "🩺"}
      </div>
      <div className={`message-bubble ${isOwn ? "own" : "other"}`}>
        <div className="message-header">
          {isOwn ? "You" : isUser ? "Patient" : "Doctor"}
        </div>
        <div className="message-content">{message.content}</div>
        <div className="message-time">
          {message.display_time ||
            (message.timestamp?.includes("T")
              ? new Date(message.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : message.timestamp)}
        </div>
      </div>
    </div>
  );
}
