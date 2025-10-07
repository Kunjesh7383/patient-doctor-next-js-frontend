// components/SuggestedQuestions.jsx
import React from "react";

export default function SuggestedQuestions({
  questions,
  messageIndex,
  sourceType,
  onSendQuestion,
  priority = "normal",
  isNewlyGenerated = false,
  sessionId,
  isSaved = false,
}) {
  if (!questions || questions.length === 0) return null;

  return (
    <div
      className={`suggested-questions-container ${priority} ${
        isNewlyGenerated ? "newly-generated" : ""
      } ${isSaved ? "saved-questions" : ""}`}
    >
      <div className="suggestions-header">
        <div className="suggestions-title">
          <span className="suggestions-icon">💡</span>
          <span className="suggestions-text">
            {isSaved ? "Saved Questions" : "Suggestions"}
          </span>
          <span className="questions-count">{questions.length}</span>
          {isNewlyGenerated && <span className="new-badge">NEW</span>}
          {isSaved && <span className="saved-badge">SAVED</span>}
        </div>
        <div className="suggestions-source">
          {sourceType === "live_transcription" ? (
            <span className="source-badge live">From Live Speech</span>
          ) : sourceType === "patient_transcription" ? (
            <span className="source-badge auto">Auto-Generated</span>
          ) : sourceType === "manual" ? (
            <span className="source-badge manual">Doctor Generated</span>
          ) : sourceType === "saved" ? (
            <span className="source-badge saved">From Database</span>
          ) : (
            <span className="source-badge message">From Message</span>
          )}

          {sessionId && (
            <span className="session-badge">
              Session: {sessionId.split("_")[1]}
            </span>
          )}
        </div>
      </div>

      <div className="questions-list">
        {questions.map((question, idx) => (
          <div
            key={question.id || idx}
            className={`question-item ${question.sent ? "question-sent" : ""}`}
          >
            <div className="question-content">
              <div className="question-number">{idx + 1}.</div>
              <div className="question-text">{question.text}</div>
            </div>
            <div className="question-actions">
              {!question.sent ? (
                <button
                  className={`send-question-btn ${priority} ${
                    question.sending ? "sending" : ""
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSendQuestion(question, messageIndex);
                  }}
                  disabled={question.sending || question.sent}
                  title={
                    question.sending
                      ? "Sending question to patient..."
                      : question.sent
                      ? "Question has been sent"
                      : "Send this question to patient"
                  }
                >
                  {question.sending
                    ? "Sending..."
                    : priority === "critical"
                    ? "🚨 Send Urgent"
                    : "Send"}
                </button>
              ) : (
                <div className="sent-status">
                  <span
                    className="sent-indicator"
                    title="Question has been sent to patient"
                  >
                    ✅ Sent
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
