import React, { useState, useEffect } from "react";
import { ROLES } from "../constants";
import { useTranscription } from "../contexts/TranscriptionContext";

export default function LiveTranscriptionDisplay({
  mode,
  liveTranscription,
  currentSpeaker,
  currentAnalysis,
  onManualTrigger,
  isConnected,
  sessionId,
}) {
  const {
    liveTranscription: contextLiveTranscription,
    currentSpeaker: contextCurrentSpeaker,
    isConnected: contextIsConnected,
  } = useTranscription();

  const [isProcessing, setIsProcessing] = useState(false);

  // Use props first, fallback to context
  const primaryLiveTranscription =
    liveTranscription || contextLiveTranscription || "";
  const activeSpeaker = currentSpeaker || contextCurrentSpeaker;
  const connectionStatus =
    isConnected !== undefined ? isConnected : contextIsConnected;

  console.log("LiveTranscription Debug:", {
    mode,
    primaryLiveTranscription: primaryLiveTranscription?.substring(0, 30),
    activeSpeaker,
    connectionStatus,
    shouldShowForDoctor: mode === ROLES.DOCTOR && activeSpeaker === "patient",
    hasText: !!primaryLiveTranscription && primaryLiveTranscription.length > 0,
  });

  // Visibility check
  if (!primaryLiveTranscription || primaryLiveTranscription.length === 0) {
    console.log("No transcription text, hiding component");
    return null;
  }

  if (mode === ROLES.DOCTOR && activeSpeaker !== "patient") {
    console.log("Doctor mode but speaker is not patient, hiding component");
    return null;
  }

  if (mode === ROLES.PATIENT && activeSpeaker !== "doctor") {
    console.log("Patient mode but speaker is not doctor, hiding component");
    return null;
  }

  const handleManualTrigger = () => {
    if (onManualTrigger) {
      onManualTrigger(primaryLiveTranscription);
    }
  };

  return (
    <div className={`live-transcription ${currentAnalysis?.risk}`}>
      <div className="live-transcription-header">
        <div className="indicator">
          <div className="pulse-dot"></div>
          <span>
            {activeSpeaker === "doctor" ? "Doctor" : "Patient"} speaking live...
          </span>
        </div>
        <div className="live-stats">
          <span className="char-count">
            {primaryLiveTranscription.length} chars
          </span>
          {sessionId && (
            <span className="session-indicator">{sessionId.split("_")[1]}</span>
          )}
          <span
            className={`connection-status ${
              connectionStatus ? "connected" : "disconnected"
            }`}
          >
            {connectionStatus ? "LIVE" : "DISCONNECTED"}
          </span>
        </div>
      </div>

      <div className="live-transcription-content">
        {primaryLiveTranscription}
        {connectionStatus && <span className="cursor">|</span>}
      </div>

      <div className="live-transcription-footer">
        <span className="live-length-indicator">
          {primaryLiveTranscription.length >= 30
            ? "Ready for AI"
            : `${30 - primaryLiveTranscription.length} chars needed`}
        </span>
        <button
          onClick={handleManualTrigger}
          className={currentAnalysis?.risk === "critical" ? "urgent" : ""}
        >
          {currentAnalysis?.risk === "critical"
            ? "Generate Urgent Questions"
            : "Generate Questions Now"}
        </button>
      </div>
    </div>
  );
}
