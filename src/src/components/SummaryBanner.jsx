// components/SummaryBanner.jsx
import React from "react";

export default function SummaryBanner({ summary }) {
  return (
    <div
      style={{
        margin: "10px auto",
        maxWidth: "1000px",
        width: "100%",
        padding: "0 20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          backgroundColor: "#fff3cd",
          color: "#856404",
          padding: "10px",
          borderLeft: "5px solid #ffc107",
          borderRadius: "5px",
        }}
      >
        <strong>Conversation Summary:</strong>
        <br />
        {summary}
      </div>
    </div>
  );
}
