// components/doctor/ErrorNotificationManager.jsx
import React from "react";

export function ErrorNotificationManager({ errors, onDismissError }) {
  if (errors.length === 0) return null;

  return (
    <div className="error-display-container">
      {errors.map((error, index) => (
        <div
          key={error.id || index}
          className={`error-notification ${error.type}`}
        >
          <div className="error-content">
            <div className="error-message">
              <div className="error-title">{error.title || "Error"}</div>
              <div className="error-text">{error.message}</div>
              {error.details && (
                <div className="error-details">{error.details}</div>
              )}
            </div>
            <button
              onClick={() => onDismissError(error.id)}
              className="dismiss-error-btn"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
