// components/Footer.jsx
import React from "react";
import { ROLES } from "../constants";
import { Mic } from "lucide-react";

export default function Footer({
  mode,
  isListening,
  toggleSpeechRecognition,
  liveTranscription,
  currentUsername,
  transcriptionContext,
}) {
  return (
    <footer
      style={{
        padding: "20px",
        borderTop: "1px solid #dee2e6",
        position: "sticky",
        bottom: 0,
        zIndex: 50,
      }}
    >

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          // width: "100hw",
          // height: "100vh",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <button
            onClick={toggleSpeechRecognition}
            disabled={!currentUsername}
            style={{
              width: "66px",
              height: "66px",
              borderRadius: "50%",
              backgroundColor: "white",
              border: "2px solid #a879ffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Mic
              style={{
                width: "34px",
                height: "34px",
                color: "#a879ffff",
              }}
            />
          </button>

       

          {/* Simple Status Text */}
          <div
            style={{
              textAlign: "center",
              fontSize: "14px",
              color: "#495057",
              fontWeight: 500,
            }}
          >
            {!currentUsername
              ? "Select a patient to start recording"
              : isListening
                ? "Recording... Click to stop"
                : "Click to start recording"}
          </div>


        </div>
      </div>
    </footer>
  );
}
