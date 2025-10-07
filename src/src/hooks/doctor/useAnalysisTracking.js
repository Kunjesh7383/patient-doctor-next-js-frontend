// hooks/doctor/useAnalysisTracking.js
import { useState, useCallback, useEffect } from "react";

// Utility function
const extractAnalysisFromMessage = (message) => {
  if (message.generated_questions && message.generated_questions.length > 0) {
    return message.generated_questions[0].analysis;
  }
  return null;
};

export function useAnalysisTracking(messages) {
  //  Analysis state
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState({});

  //  Extract latest analysis from messages
  useEffect(() => {
    if (messages.length > 0) {
      // Find the most recent patient message with analysis
      const patientMessages = messages.filter((msg) => msg.role === "user");
      for (let i = patientMessages.length - 1; i >= 0; i--) {
        const analysis = extractAnalysisFromMessage(patientMessages[i]);
        if (analysis) {
          console.log("Found latest analysis from messages:", analysis);
          setCurrentAnalysis(analysis);
          break;
        }
      }
    }
  }, [messages]);

  //  Update analysis function
  const updateAnalysis = useCallback((analysis, messageId = null) => {
    if (!analysis) return;

    console.log("📊 Updating analysis:", analysis);
    setCurrentAnalysis(analysis);

    // Store in history if messageId provided
    if (messageId) {
      setAnalysisHistory((prev) => ({
        ...prev,
        [messageId]: analysis,
      }));
    }
  }, []);

  // Get analysis for specific message
  const getAnalysisForMessage = useCallback(
    (messageId) => {
      return (
        analysisHistory[messageId] ||
        extractAnalysisFromMessage(
          messages.find((msg) => msg.message_id === messageId)
        ) ||
        null
      );
    },
    [analysisHistory, messages]
  );

  // Clear analysis
  const clearAnalysis = useCallback(() => {
    setCurrentAnalysis(null);
    setAnalysisHistory({});
  }, []);

  //  Get analysis summary for display
  const getAnalysisSummary = useCallback(() => {
    if (!currentAnalysis) return null;

    return {
      emotion: currentAnalysis.emotion || "neutral",
      sentiment: currentAnalysis.sentiment || "neutral",
      risk: currentAnalysis.risk || "low",
      confidence: currentAnalysis.confidence || 0.5,
      severity: currentAnalysis.severity_score,
      intent: currentAnalysis.intent,
      complexity: currentAnalysis.complexity,
    };
  }, [currentAnalysis]);

  return {
    // State
    currentAnalysis,
    analysisHistory,

    // Functions
    updateAnalysis,
    getAnalysisForMessage,
    clearAnalysis,
    getAnalysisSummary,
    extractAnalysisFromMessage,
  };
}
