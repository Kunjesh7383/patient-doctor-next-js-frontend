"use client";
import { ThemeProvider } from "react-bootstrap";
import { TranscriptionProvider } from "@legacy/contexts/TranscriptionContext";
import App from "@legacy/App.jsx";

export default function PatientPage() {
  return (
    <ThemeProvider>
      <TranscriptionProvider>
        <App />
      </TranscriptionProvider>
    </ThemeProvider>
  );
}


