// api.ts (Next.js + TypeScript)
import axios, { AxiosInstance } from "axios";

// Preserve existing behavior but prefer env vars when provided
const DEFAULT_API_URL = "https://glen3wiz.com/api";
const DEFAULT_WS_URL = "wss://glen3wiz.com/api";

export const API_URL: string =
  process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
export const WS_URL: string = process.env.NEXT_PUBLIC_WS_URL || DEFAULT_WS_URL;

const axiosInstance: AxiosInstance = axios.create({
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // eslint-disable-next-line no-console
    console.error("❌ API Error:", error);
    if (error.response) {
      // eslint-disable-next-line no-console
      console.error("Response data:", error.response.data);
      // eslint-disable-next-line no-console
      console.error("Response status:", error.response.status);
    } else if (error.code === "ECONNABORTED") {
      // eslint-disable-next-line no-console
      console.error("🕐 Request timed out - AI processing taking too long");
    }
    return Promise.reject(error);
  }
);

export interface ChatMessage {
  message_id?: string;
  role: "user" | "doctor" | string;
  content: string;
  timestamp?: string;
  sender?: "patient" | "doctor" | string;
}

export const fetchChatHistory = (username: string) =>
  axiosInstance.get(`${API_URL}/chat/history/${username}`);

export const appendPatientMessage = (patient_id: string, message: string) =>
  axiosInstance.post(`${API_URL}/append_message`, { patient_id, message });

export const fetchSuggestions = (
  message: string,
  patient_id: string,
  rag_type?: string
) =>
  axiosInstance.post(
    `${API_URL}/chat`,
    { message, patient_id },
    { params: { rag_type } }
  );

export const sendDoctorReply = (
  patient_id: string,
  doctor_reply: string
) =>
  axiosInstance.post(`${API_URL}/send_doctor_reply`, {
    patient_id,
    doctor_reply,
  });

export const generateQuestions = (patient_id: string, payload: unknown) =>
  axiosInstance.post(`${API_URL}/chat/suggest/${patient_id}`, payload, {
    timeout: 90000,
  });


