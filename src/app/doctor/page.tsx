"use client";
import { ThemeProvider } from "react-bootstrap";
import App from "@legacy/App.jsx";
import { TranscriptionProvider } from "@legacy/contexts/TranscriptionContext";

export default function DoctorPage() {
  return (
    <ThemeProvider>
      <TranscriptionProvider>
        <App />
      </TranscriptionProvider>
    </ThemeProvider>
  );
}


