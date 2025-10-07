// components/DoctorMessageInput.jsx
import React, { useState } from "react";

export default function DoctorMessageInput({
  onSendMessage,
  isConnected,
  isSending = false,
}) {
  const [messageText, setMessageText] = useState("");

  const handleSend = () => {
    if (!messageText.trim() || isSending || !isConnected) return;

    onSendMessage(messageText.trim());
    setMessageText(""); // This clears the input after sending
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="doctor-message-input">
      <div className="input-container">
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={
            isConnected
              ? "Type your message to patient..."
              : "Waiting for patient connection..."
          }
          disabled={!isConnected || isSending}
          className={`message-textarea ${!isConnected ? "disabled" : ""}`}
          rows={2}
        />
        <button
          onClick={handleSend}
          disabled={!messageText.trim() || !isConnected || isSending}
          className={`send-message-btn ${
            !messageText.trim() || !isConnected ? "disabled" : ""
          } ${isSending ? "sending" : ""}`}
          title={
            !isConnected ? "Patient not connected" : "Send message to patient"
          }
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </div>

      {messageText.length > 0 && (
        <div className="message-stats">
          <span className="char-count">{messageText.length} characters</span>
        </div>
      )}
    </div>
  );
}
