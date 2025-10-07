// components/doctor/DoctorHeader.jsx
import React from "react";

export function DoctorHeader({
  currentUsername,
  currentAnalysis,
  PatientAnalysisDisplay,
}) {
  return (
    <div className="analysis-header d-none">
      <div className="patient-info">
        <h3>Patient: {currentUsername}</h3>
      </div>

      {/* ✅ Patient Analysis Display */}
      {currentAnalysis && (
        <PatientAnalysisDisplay
          analysis={currentAnalysis}
          title="Current Patient Analysis"
        />
      )}
    </div>
  );
}
