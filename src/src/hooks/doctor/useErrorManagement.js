// hooks/doctor/useErrorManagement.js
import { useState, useCallback } from "react";

export function useErrorManagement() {
  // Error state
  const [errors, setErrors] = useState([]);

  // Add error function
  const addError = useCallback((error) => {
    const errorWithId = {
      ...error,
      id:
        error.id ||
        `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    setErrors((prev) => [...prev, errorWithId]);

    // Auto-dismiss non-critical errors after 8 seconds
    if (error.type !== "critical") {
      setTimeout(() => dismissError(errorWithId.id), 8000);
    }
  }, []);

  // Dismiss error function
  const dismissError = useCallback((errorId) => {
    setErrors((prev) => prev.filter((error) => error.id !== errorId));
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // Get error count by type
  const getErrorCount = useCallback(
    (type = null) => {
      if (!type) return errors.length;
      return errors.filter((error) => error.type === type).length;
    },
    [errors]
  );

  return {
    // Error state
    errors,

    // Error functions
    addError,
    dismissError,
    clearErrors,
    getErrorCount,
  };
}
