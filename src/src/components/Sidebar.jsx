// components/Sidebar,jsx
import React from "react";
import { ROLES } from "../constants";

export default function Sidebar({
  isOpen,
  onClose,
  username,
  setUsername,
  onUsernameSubmit,
  patients = [], // New prop for patient list
  activePatientId, // New prop for active patient
  onSelectPatient, // New prop for patient selection handler
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        width: isOpen ? 280 : 0,
        background: "#f8f9fa",
        boxShadow: isOpen ? "2px 0 5px rgba(0,0,0,0.1)" : "none",
        zIndex: 1000,
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "all 0.3s ease-in-out",
        overflow: "hidden",
        borderRight: "1px solid #dee2e6",
      }}
      aria-label="Sidebar"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px",
          borderBottom: "1px solid #dee2e6",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>

          <div>
            <h3
              style={{
                margin: 0,
                color: "white",
                fontSize: "18px",
                fontWeight: 600,
              }}
            >
              Healthcare Platform
            </h3>
            
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close sidebar"
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            fontSize: 20,
            cursor: "pointer",
            color: "white",
            padding: "4px 8px",
            borderRadius: "4px",
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          padding: "20px",
          height: "calc(100vh - 70px)",
          overflowY: "auto",
        }}
      >
        {/* Username Input Section */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 500,
              color: "#495057",
              fontSize: "14px",
            }}
          >
            Enter Patient Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && username.trim()) {
                onUsernameSubmit(username.trim());
              }
            }}
            placeholder="Patient username"
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ced4da",
              borderRadius: "4px",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          />
          {username.trim() && (
            <button
              onClick={() => onUsernameSubmit(username.trim())}
              style={{
                width: "100%",
                marginTop: "8px",
                padding: "8px",
                background: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Load Patient
            </button>
          )}
        </div>

        {/* Patient List Section */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 500,
              color: "#495057",
              fontSize: "14px",
            }}
          >
            Active Patients
          </label>
          <div
            style={{
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              maxHeight: "400px", // Increased from 200px to 400px
              overflowY: "auto",
            }}
          >
            {patients.length === 0 ? (
              <div
                style={{
                  padding: "12px",
                  textAlign: "center",
                  color: "#6c757d",
                  fontSize: "14px",
                }}
              >
                No patients found
              </div>
            ) : (
              patients.map((patient) => (
                <div
                  key={patient.patient_id || patient.id}
                  onClick={() => {
                    onSelectPatient(patient.patient_id || patient.id);
                    onClose(); // Close sidebar after selection
                  }}
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                    backgroundColor:
                      (patient.patient_id || patient.id) === activePatientId
                        ? "#e3f2fd"
                        : "#fff",
                    transition: "background-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (
                      (patient.patient_id || patient.id) !== activePatientId
                    ) {
                      e.target.style.backgroundColor = "#f8f9fa";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (
                      (patient.patient_id || patient.id) !== activePatientId
                    ) {
                      e.target.style.backgroundColor = "#fff";
                    }
                  }}
                >
                  <div
                    style={{
                      fontWeight: 500,
                      color: "#495057",
                      fontSize: "14px",
                    }}
                  >
                    {patient.patient_id || patient.id}
                  </div>
                  {patient.status && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6c757d",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: "2px",
                      }}
                    >
                      <span>
                        Status:{" "}
                        <span
                          style={{
                            color:
                              patient.status === "active"
                                ? "#28a745"
                                : "#6c757d",
                          }}
                        >
                          {patient.status}
                        </span>
                      </span>
                      {patient.unread_count > 0 && (
                        <span
                          style={{
                            backgroundColor: "#dc3545",
                            color: "white",
                            borderRadius: "10px",
                            padding: "2px 6px",
                            fontSize: "10px",
                            fontWeight: "bold",
                          }}
                        >
                          {patient.unread_count}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
