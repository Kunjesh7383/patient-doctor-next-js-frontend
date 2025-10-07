// components/RagTypeSelector.jsx
import React from "react";
import { RAG_TYPES } from "../constants";

export default function RagTypeSelector({ ragType, setRagType }) {
  return (
    <div
      style={{
        padding: "12px 20px",
        background: "#fff",
        borderBottom: "1px solid #dee2e6",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        maxWidth: "1000px",
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <span style={{ fontWeight: 500, color: "#495057" }}>
        🧩 Select LLM type for suggestions:
      </span>
      {RAG_TYPES.map((type) => (
        <label
          key={type}
          style={{
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <input
            type="radio"
            value={type}
            checked={ragType === type}
            onChange={(e) => setRagType(e.target.value)}
            style={{ marginRight: "4px" }}
          />
          <span>{type}</span>
        </label>
      ))}
    </div>
  );
}
