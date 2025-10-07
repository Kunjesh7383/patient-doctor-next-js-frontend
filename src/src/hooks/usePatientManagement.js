// hooks/usePatientManagement.js
import { useState, useCallback, useEffect } from "react";
import { API_URL } from "../api";
// const API_URL = "http://localhost:8080";

export function usePatientManagement() {
  const [patients, setPatients] = useState([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [currentUsername, setCurrentUsername] = useState("");

  const fetchPatients = useCallback(async () => {
    setIsLoadingPatients(true);
    try {
      const activeRes = await fetch(`${API_URL}/patients/active`);
      if (activeRes.ok) {
        const activeData = await activeRes.json();
        if (activeData?.length > 0) {
          setPatients(activeData);
          return;
        }
      }

      const basicRes = await fetch(`${API_URL}/patients`);
      if (basicRes.ok) {
        const basicData = await basicRes.json();
        const basicPatients = basicData.patients || [];
        setPatients(
          basicPatients.map((p) => ({
            patient_id: p,
            id: p,
            status: "gray",
            unread_count: 0,
            last_message: "",
          }))
        );
      }
    } catch (err) {
      console.error("❌ Failed to fetch patients:", err);
      setPatients([]);
    } finally {
      setIsLoadingPatients(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return {
    patients,
    isLoadingPatients,
    currentUsername,
    setCurrentUsername,
    fetchPatients,
  };
}
