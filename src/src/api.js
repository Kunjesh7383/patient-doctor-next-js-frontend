// api.js
import axios from "axios";

// ✅ FIXED: Increased timeout for AI question generation
// export const API_URL = "http://127.0.0.1:8000";
// export const WS_URL = "ws://127.0.0.1:8000";

// api.js
export const API_URL = "https://glen3wiz.com/api";
export const WS_URL = "wss://glen3wiz.com/api";

const axiosInstance = axios.create({
  timeout: 60000, // ✅ Increased from 10s to 60s for AI processing
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Enhanced response interceptor for debugging
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("❌ API Error:", error);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    } else if (error.code === "ECONNABORTED") {
      console.error("🕐 Request timed out - AI processing taking too long");
    }
    return Promise.reject(error);
  }
);

export const fetchChatHistory = (username) =>
  axiosInstance.get(`${API_URL}/chat/history/${username}`);

export const appendPatientMessage = (patient_id, message) =>
  axiosInstance.post(`${API_URL}/append_message`, { patient_id, message });

export const fetchSuggestions = (message, patient_id, rag_type) =>
  axiosInstance.post(
    `${API_URL}/chat`,
    { message, patient_id },
    { params: { rag_type } }
  );

export const sendDoctorReply = (patient_id, doctor_reply) =>
  axiosInstance.post(`${API_URL}/send_doctor_reply`, {
    patient_id,
    doctor_reply,
  });

// ✅ Enhanced question generation with longer timeout
export const generateQuestions = (patient_id, payload) =>
  axiosInstance.post(`${API_URL}/chat/suggest/${patient_id}`, payload, {
    timeout: 90000, // ✅ Extra long timeout for complex AI processing
  });
