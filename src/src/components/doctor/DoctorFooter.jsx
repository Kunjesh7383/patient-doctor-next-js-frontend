// components/doctor/DoctorFooter.jsx
import React from "react";

export function DoctorFooter({
  isConnected,
  messages,
  events,
  currentSessionId,
  liveTranscription,
  errors,
  onSendMessage,
  isSending,
  onGenerateSuggestions,
  canGenerateQuestions,
  getGenerateButtonText,
  isGeneratingQuestions,
  DoctorMessageInput,
}) {
  return (
    <div className="footer">
      <div className="status-row">
        <span className={isConnected ? "connected" : "disconnected"}>
          {isConnected ? "🟢 Connected to Patient" : "🔴 Waiting for Patient"}
        </span>
        <span>{messages.length} messages</span>
        <span>{events.length} question sets</span>
        {currentSessionId && (
          <span className="session-info">
            📝 Session: {currentSessionId.split("_")[1]}
          </span>
        )}
        {liveTranscription && (
          <span className="live-indicator">
            🎤 Live: {liveTranscription.length} chars
          </span>
        )}
        {errors.length > 0 && (
          <span className="error-count">⚠️ {errors.length} errors</span>
        )}
      </div>

      <div
        className="analysis-actions"
        style={{ display: "flex", alignItems: "center", gap: "10px" }}
      >
        <DoctorMessageInput
          onSendMessage={onSendMessage}
          isConnected={isConnected}
          isSending={isSending}
        />

        <button
          className={`generate-button ms-4 p-2 bg-purple-100 ${
            !canGenerateQuestions() ? "disabled" : ""
          } ${
            liveTranscription && liveTranscription.length >= 10
              ? "live-active"
              : ""
          } ${isGeneratingQuestions ? "generating" : ""}`}
          onClick={onGenerateSuggestions}
          disabled={!canGenerateQuestions()}
        >
          {getGenerateButtonText()}
        </button>
      </div>
    </div>
  );
}
