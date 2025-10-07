// hooks/useSuggestionManagement.js

import { useState, useCallback, useEffect } from "react";
import { fetchSuggestions, sendDoctorReply } from "../api";
import { ROLES } from "../constants";

export function useSuggestionManagement(
  mode,
  currentUsername,
  ragType,
  messages,
  loadChatHistory
) {
  const [pendingMessage, setPendingMessage] = useState("");
  const [pendingSuggestions, setPendingSuggestions] = useState([]);
  const [ragContext, setRagContext] = useState("");
  const [qaContext, setQaContext] = useState([]);
  const [lastRagType, setLastRagType] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // ✅ NEW: Analysis data state management
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState({});
  const [lastAnalysisTime, setLastAnalysisTime] = useState(null);

  const clearSuggestions = useCallback(() => {
    setPendingSuggestions([]);
    setRagContext("");
    setQaContext([]);
    setSelectedQuestion("");
    setPendingMessage("");
    setLastRagType("");
    // ✅ NEW: Clear current analysis but keep history
    setCurrentAnalysis(null);
  }, []);

  // ✅ NEW: Handle analysis data from WebSocket or API responses
  const handleAnalysisUpdate = useCallback((analysis, turnId = null) => {
    if (!analysis) return;

    console.log("📊 Received analysis update:", analysis);

    // Update current analysis
    setCurrentAnalysis(analysis);
    setLastAnalysisTime(new Date().toISOString());

    // Store in history if we have a turn ID
    if (turnId) {
      setAnalysisHistory((prev) => ({
        ...prev,
        [turnId]: {
          ...analysis,
          timestamp: new Date().toISOString(),
        },
      }));
    }
  }, []);

  // ✅ ENHANCED: Generate suggestions with analysis handling
  const generateSuggestions = useCallback(
    async (text = pendingMessage) => {
      if (!text || !currentUsername || mode !== ROLES.DOCTOR) return;

      console.log(
        "🤖 Manually generating suggestions:",
        text.substring(0, 50) + "..."
      );
      setIsLoadingSuggestions(true);

      try {
        const response = await fetchSuggestions(text, currentUsername, ragType);
        const result = response.data;
        const suggestions = Array.isArray(result.response)
          ? result.response
          : [];
        const context = result.context_used || "";
        const qaPairs = Array.isArray(result.rag_qa_pairs)
          ? result.rag_qa_pairs
          : [];

        // ✅ NEW: Handle analysis data from API response
        if (result.analysis) {
          handleAnalysisUpdate(result.analysis);
          console.log("📊 Analysis from API:", result.analysis);
        }

        setPendingSuggestions(suggestions.slice(0, 3));
        setLastRagType(ragType);
        setRagContext(context);
        setQaContext(qaPairs);
        setSelectedQuestion(suggestions.length > 0 ? suggestions[0] : "");

        console.log("✅ Generated", suggestions.length, "suggestions manually");
      } catch (error) {
        console.error("❌ Failed to generate suggestions:", error);
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    [currentUsername, mode, ragType, pendingMessage, handleAnalysisUpdate]
  );

  const sendSuggestion = useCallback(
    async (suggestionText) => {
      if (!suggestionText || !currentUsername) return;

      try {
        const response = await sendDoctorReply(currentUsername, suggestionText);
        if (response.status === 200) {
          clearSuggestions();
          setTimeout(() => loadChatHistory(currentUsername), 1000);
        }
      } catch (error) {
        console.error("❌ Failed to send suggestion:", error);
        alert("❌ Failed to send question. Please try again.");
      }
    },
    [currentUsername, loadChatHistory, clearSuggestions]
  );

  // ✅ EXISTING: Update pending message logic (unchanged)
  useEffect(() => {
    if (mode === ROLES.DOCTOR && messages.length > 0) {
      let lastPatientMsgIdx = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          lastPatientMsgIdx = i;
          break;
        }
      }
      if (lastPatientMsgIdx === -1) {
        setPendingMessage("");
        return;
      }
      let hasDoctorReply = false;
      for (let j = lastPatientMsgIdx + 1; j < messages.length; j++) {
        if (messages[j].role === "doctor") {
          hasDoctorReply = true;
          break;
        }
      }
      if (!hasDoctorReply) {
        if (pendingMessage !== messages[lastPatientMsgIdx].content) {
          setPendingMessage(messages[lastPatientMsgIdx].content);
        }
      } else {
        setPendingMessage("");
      }
    }
  }, [mode, messages, pendingMessage]);

  // ✅ NEW: Utility functions for analysis data
  const getAnalysisForMessage = useCallback(
    (messageId) => {
      return analysisHistory[messageId] || null;
    },
    [analysisHistory]
  );

  const getLatestAnalysis = useCallback(() => {
    return currentAnalysis;
  }, [currentAnalysis]);

  // ✅ NEW: Analysis summary for display
  const getAnalysisSummary = useCallback(() => {
    if (!currentAnalysis) return null;

    return {
      emotion: currentAnalysis.emotion || "neutral",
      sentiment: currentAnalysis.sentiment || "neutral",
      risk: currentAnalysis.risk || "low",
      complexity: currentAnalysis.complexity || "low",
      confidence: currentAnalysis.confidence || 0.5,
      timestamp: lastAnalysisTime,
    };
  }, [currentAnalysis, lastAnalysisTime]);

  return {
    // ✅ EXISTING: Original returned values
    pendingMessage,
    pendingSuggestions,
    ragContext,
    qaContext,
    selectedQuestion,
    isLoadingSuggestions,
    generateSuggestions,
    sendSuggestion,
    clearSuggestions,
    setSelectedQuestion,

    // ✅ NEW: Analysis-related returns
    currentAnalysis,
    analysisHistory,
    handleAnalysisUpdate,
    getAnalysisForMessage,
    getLatestAnalysis,
    getAnalysisSummary,
    lastAnalysisTime,
  };
}
