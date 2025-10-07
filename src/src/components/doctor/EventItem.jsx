// components/EventItem.jsx
import React from "react";
import SuggestedQuestions from "./SuggestedQuestions";

export default function EventItem({ event, onSendQuestion, messageIndex }) {
  if (event.type === "questions") {
    return (
      <SuggestedQuestions
        questions={event.questions}
        messageIndex={messageIndex}
        sourceType={event.sourceType}
        onSendQuestion={onSendQuestion}
        priority={event.priority}
        isNewlyGenerated={event.isNewlyGenerated}
        sessionId={event.sessionId}
        isSaved={event.isSaved}
      />
    );
  }

  return (
    <div className={`event-item ${event.type} ${event.priority}`}>
      <div className="event-icon">
        {event.type === "analysis"
          ? "📊"
          : event.type === "alert"
          ? "⚠️"
          : event.type === "error"
          ? "❌"
          : "📝"}
      </div>
      <div className="event-content">
        <div className="event-header">
          <span className="event-title">{event.title}</span>
          <span className="event-time">
            {new Date(event.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="event-details">
          {event.type === "analysis" && (
            <div className="analysis-summary">
              <span>Emotion: {event.analysis.emotion}</span>
              <span>Risk: {event.analysis.risk}</span>
              <span>
                Confidence: {(event.analysis.confidence * 100).toFixed(0)}%
              </span>
            </div>
          )}
          {(event.type === "alert" || event.type === "error") && (
            <div className="alert-content">
              <div className="alert-message">
                {event.priority} {event.type}: {event.message}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
