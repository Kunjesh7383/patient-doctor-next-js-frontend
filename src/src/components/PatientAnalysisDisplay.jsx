// components/PatientAnalysisDisplay.jsx
import React from "react";

const getRiskColor = (risk) => {
  switch (risk?.toLowerCase()) {
    case "critical":
      return "#dc3545";
    case "moderate":
      return "#ffc107";
    case "low":
      return "#28a745";
    default:
      return "#6c757d";
  }
};

const getRiskIcon = (risk) => {
  switch (risk?.toLowerCase()) {
    case "critical":
      return "🚨";
    case "moderate":
      return "⚠️";
    case "low":
      return "✅";
    default:
      return "❓";
  }
};

const getEmotionIcon = (emotion) => {
  switch (emotion?.toLowerCase()) {
    case "sadness":
      return "😢";
    case "anxiety":
      return "😰";
    case "anger":
      return "😠";
    case "fear":
      return "😱";
    case "joy":
    case "happiness":
      return "😊";
    case "surprise":
      return "😲";
    case "disgust":
      return "🤢";
    case "neutral":
      return "😐";
    default:
      return "😐";
  }
};

const getSentimentIcon = (sentiment) => {
  switch (sentiment?.toLowerCase()) {
    case "positive":
      return "👍";
    case "negative":
      return "👎";
    case "neutral":
      return "😐";
    default:
      return "❓";
  }
};

export default function PatientAnalysisDisplay({
  analysis,
  title = "Patient Emotional Analysis",
  compact = false,
}) {
  if (!analysis) {
    if (compact) return null;
    return (
      <div
        className="patient-analysis-display"
        style={{
          background: "#f8f9fa",
          padding: "15px",
          margin: "10px 0",
          borderRadius: "8px",
          border: "1px solid #ddd",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>{title}</h4>
        <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
          Waiting for patient input to analyze emotions...
        </p>
      </div>
    );
  }

  const containerStyle = compact
    ? {
        background: "#f8f9fa",
        padding: "10px",
        borderRadius: "6px",
        border: "1px solid #e0e6ed",
        marginTop: "10px",
      }
    : {
        background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
        borderRadius: "12px",
        padding: "20px",
        margin: "15px 0",
        borderLeft: `4px solid ${getRiskColor(analysis.risk)}`,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      };

  const gridStyle = compact
    ? {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: "8px",
      }
    : {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "15px",
      };

  const metricStyle = compact
    ? {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px",
        background: "#fff",
        borderRadius: "4px",
        border: "1px solid #e0e6ed",
      }
    : {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px",
        background: "#fff",
        borderRadius: "8px",
        border: "1px solid #e0e6ed",
      };

  return (
    <div className="patient-analysis-display" style={containerStyle}>
      <div
        className="analysis-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: compact ? "10px" : "15px",
        }}
      >
        <h4
          style={{
            margin: 0,
            color: "#2c3e50",
            fontSize: compact ? "14px" : "18px",
            fontWeight: 600,
          }}
        >
          {title}
        </h4>
      </div>

      <div className="analysis-metrics" style={gridStyle}>
        {/* Risk Level */}
        <div
          className="analysis-metric risk-metric"
          style={{
            ...metricStyle,
            borderLeft: `3px solid ${getRiskColor(analysis.risk)}`,
          }}
        >
          <span
            style={{
              fontSize: compact ? "18px" : "24px",
              minWidth: compact ? "20px" : "30px",
            }}
          >
            {getRiskIcon(analysis.risk)}
          </span>
          <div>
            <div
              style={{
                fontSize: compact ? "10px" : "12px",
                color: "#6c757d",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Risk Level
            </div>
            <div
              style={{
                fontSize: compact ? "12px" : "14px",
                fontWeight: 600,
                color: getRiskColor(analysis.risk),
                textTransform: "capitalize",
              }}
            >
              {analysis.risk || "Unknown"}
            </div>
          </div>
        </div>

        {/* Emotion */}
        <div className="analysis-metric emotion-metric" style={metricStyle}>
          <span
            style={{
              fontSize: compact ? "18px" : "24px",
              minWidth: compact ? "20px" : "30px",
            }}
          >
            {getEmotionIcon(analysis.emotion)}
          </span>
          <div>
            <div
              style={{
                fontSize: compact ? "10px" : "12px",
                color: "#6c757d",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Emotion
            </div>
            <div
              style={{
                fontSize: compact ? "12px" : "14px",
                fontWeight: 600,
                color: "#2c3e50",
                textTransform: "capitalize",
              }}
            >
              {analysis.emotion || "Unknown"}
            </div>
          </div>
        </div>

        {/* Sentiment */}
        <div className="analysis-metric sentiment-metric" style={metricStyle}>
          <span
            style={{
              fontSize: compact ? "18px" : "24px",
              minWidth: compact ? "20px" : "30px",
            }}
          >
            {getSentimentIcon(analysis.sentiment)}
          </span>
          <div>
            <div
              style={{
                fontSize: compact ? "10px" : "12px",
                color: "#6c757d",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Sentiment
            </div>
            <div
              style={{
                fontSize: compact ? "12px" : "14px",
                fontWeight: 600,
                color: "#2c3e50",
                textTransform: "capitalize",
              }}
            >
              {analysis.sentiment || "Unknown"}
            </div>
          </div>
        </div>

        {/* Confidence */}
        <div className="analysis-metric confidence-metric" style={metricStyle}>
          <span
            style={{
              fontSize: compact ? "18px" : "24px",
              minWidth: compact ? "20px" : "30px",
            }}
          >
            📊
          </span>
          <div>
            <div
              style={{
                fontSize: compact ? "10px" : "12px",
                color: "#6c757d",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Confidence
            </div>
            <div
              style={{
                fontSize: compact ? "12px" : "14px",
                fontWeight: 600,
                color: "#2c3e50",
              }}
            >
              {analysis.confidence
                ? (analysis.confidence * 100).toFixed(1) + "%"
                : "N/A"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
