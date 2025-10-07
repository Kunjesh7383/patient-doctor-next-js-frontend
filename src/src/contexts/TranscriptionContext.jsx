// contexts/TranscriptionContext.jsx
import React, { createContext, useContext, useState, useCallback } from "react";
import { API_URL } from "../api";

const TranscriptionContext = createContext();

export const TranscriptionProvider = ({ children }) => {
  // ✅ ENHANCED: Session-based transcription states
  const [liveTranscription, setLiveTranscription] = useState("");
  const [finalTranscription, setFinalTranscription] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionTranscript, setSessionTranscript] = useState(""); // Accumulated session text

  // ✅ NEW: Speaker and role management
  const [currentSpeaker, setCurrentSpeaker] = useState(null); // 'patient' | 'doctor' | null
  const [currentUserMode, setCurrentUserMode] = useState("patient"); // 'patient' | 'doctor'
  const [isConnected, setIsConnected] = useState(false);
  const [websocket, setWebsocket] = useState(null);

  // ✅ ENHANCED: Question states with highlighting support
  const [suggestions, setSuggestions] = useState([]);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [highlightedPortions, setHighlightedPortions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  // ✅ NEW: Session management states
  const [isRecording, setIsRecording] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [lastQuestionGeneration, setLastQuestionGeneration] = useState(null);

  // ✅ ENHANCED: Constants
  const MAX_TRANSCRIPTION_LENGTH = 200;
  const MIN_TEXT_LENGTH = 5;
  const MIN_QUESTION_TEXT_LENGTH = 10;
  const QUESTION_GENERATION_THROTTLE = 3000;

  // ✅ ENHANCED: Text truncation with session awareness
  const truncateText = useCallback(
    (text, maxLength = MAX_TRANSCRIPTION_LENGTH) => {
      if (!text || text.length <= maxLength) return text;

      const truncated = text.substring(0, maxLength);
      const lastSpaceIndex = truncated.lastIndexOf(" ");

      if (lastSpaceIndex > maxLength * 0.8) {
        return truncated.substring(0, lastSpaceIndex);
      }

      return truncated;
    },
    []
  );

  // ✅ NEW: Session management functions
  const startRecordingSession = useCallback(() => {
    const sessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    setCurrentSessionId(sessionId);
    setSessionTranscript("");
    setIsRecording(true);
    setSessionStartTime(new Date().toISOString());
    setGeneratedQuestions([]);
    setHighlightedPortions([]);

    console.log("🎤 Recording session started:", sessionId);
    return sessionId;
  }, []);

  const stopRecordingSession = useCallback(() => {
    setIsRecording(false);
    console.log("🛑 Recording session stopped:", currentSessionId);

    // Keep session data for final processing but mark as completed
    const finalSessionData = {
      sessionId: currentSessionId,
      finalText: sessionTranscript,
      questions: generatedQuestions,
      highlights: highlightedPortions,
      endTime: new Date().toISOString(),
    };

    console.log("📝 Session completed:", finalSessionData);
    return finalSessionData;
  }, [
    currentSessionId,
    sessionTranscript,
    generatedQuestions,
    highlightedPortions,
  ]);

  const clearSession = useCallback(() => {
    setCurrentSessionId(null);
    setSessionTranscript("");
    setIsRecording(false);
    setSessionStartTime(null);
    setGeneratedQuestions([]);
    setHighlightedPortions([]);
    console.log("🧹 Session cleared");
  }, []);

  // ✅ ENHANCED: Core transcription update with session and speaker awareness
  const updateTranscription = useCallback(
    (text, speaker, messageType = "partial") => {
      console.log("=== ENHANCED TRANSCRIPTION UPDATE ===");
      console.log("Input:", {
        text: text?.substring(0, 50),
        speaker,
        messageType,
        currentMode: currentUserMode,
      });

      // ✅ CRITICAL: Speaker change tracking
      if (speaker && speaker !== currentSpeaker) {
        console.log("🔄 Speaker changed:", currentSpeaker, "->", speaker);
        setCurrentSpeaker(speaker);
      }

      const truncatedText = truncateText(text);

      // ✅ NEW: Session-based transcript accumulation
      if (messageType === "final" && speaker === "patient" && isRecording) {
        setSessionTranscript((prev) => {
          const newSessionText = prev
            ? `${prev} ${truncatedText}`
            : truncatedText;
          console.log(
            "📝 Session transcript updated:",
            newSessionText.substring(0, 50)
          );
          return newSessionText;
        });
      }

      // ✅ ENHANCED: Role-based transcription display logic
      if (currentUserMode === "doctor") {
        // ✅ Doctor sees all live transcription (patient speaking)
        if (speaker === "patient") {
          setLiveTranscription(truncatedText);
          console.log(
            "🩺 Doctor sees patient live transcription:",
            truncatedText?.substring(0, 30)
          );
        }
      } else if (currentUserMode === "patient") {
        // ✅ Patient ONLY sees doctor messages, NO self-transcription
        if (speaker === "doctor") {
          setLiveTranscription(truncatedText);
          console.log(
            "👤 Patient sees doctor transcription:",
            truncatedText?.substring(0, 30)
          );
        } else if (speaker === "patient") {
          // ✅ CRITICAL: Patient does NOT see their own transcription
          console.log(
            "🚫 Patient self-transcription blocked (correct behavior)"
          );
          setLiveTranscription(""); // Clear any patient self-transcription
        }
      }

      // ✅ ENHANCED: Final transcription handling
      if (messageType === "final") {
        setFinalTranscription(truncatedText);

        // ✅ Auto-generate suggestions for patient final text
        if (speaker === "patient" && truncatedText?.length >= MIN_TEXT_LENGTH) {
          setTimeout(() => {
            generateSuggestionsFromTranscription(truncatedText);
          }, 300);
        }
      }

      // ✅ NEW: Auto-generate questions from patient speech (for doctors)
      if (
        speaker === "patient" &&
        truncatedText?.length >= MIN_QUESTION_TEXT_LENGTH &&
        currentUserMode === "doctor"
      ) {
        const isPartial = messageType === "partial";

        // Throttle question generation
        const now = Date.now();
        if (
          !lastQuestionGeneration ||
          now - lastQuestionGeneration >= QUESTION_GENERATION_THROTTLE
        ) {
          setTimeout(
            () => {
              generateQuestionsFromText(truncatedText, isPartial);
            },
            isPartial ? 2000 : 500
          );
        }
      }
    },
    [
      currentSpeaker,
      currentUserMode,
      isRecording,
      truncateText,
      lastQuestionGeneration,
    ]
  );

  // ✅ ENHANCED: Question generation with highlighting
  const generateQuestionsFromText = useCallback(
    async (text, isPartial = false) => {
      if (!text || text.trim().length < MIN_QUESTION_TEXT_LENGTH) {
        console.log(
          "⚠️ Text too short for question generation:",
          text?.length || 0
        );
        return [];
      }

      // Throttling
      const now = Date.now();
      if (
        isPartial &&
        lastQuestionGeneration &&
        now - lastQuestionGeneration < QUESTION_GENERATION_THROTTLE
      ) {
        console.log("⚠️ Question generation throttled");
        return [];
      }

      if (isGeneratingQuestions) {
        console.log("⚠️ Already generating questions");
        return [];
      }

      setIsGeneratingQuestions(true);
      setLastQuestionGeneration(now);

      console.log("💡 Generating questions:", {
        text: text.substring(0, 50),
        isPartial,
        sessionId: currentSessionId,
      });

      try {
        const requestBody = {
          patient_input: text.trim(),
          rag_type: "standard",
          include_partial: isPartial,
          generate_questions: true,
          context_type: isPartial ? "partial" : "final",
          session_id: currentSessionId,
        };

        const response = await fetch(`${API_URL}/chat/suggest/patient`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const data = await response.json();
          const questions = data.questions || data.items || [];

          // ✅ NEW: Create question objects with highlighting data
          const questionObjects = questions.map((q, index) => ({
            id: `${isPartial ? "partial" : "final"}_${now}_${index}`,
            text: q,
            source: isPartial ? "partial" : "final",
            timestamp: new Date().toISOString(),
            sourceText: text,
            sessionId: currentSessionId,
            used_portion: [0, text.length], // Full text highlighted
            generated_from: isPartial ? "partial" : "final",
          }));

          // ✅ NEW: Add highlighting information
          if (questionObjects.length > 0) {
            const highlightInfo = {
              start: 0,
              end: text.length,
              reason: "question_generation",
              question_ids: questionObjects.map((q) => q.id),
              timestamp: new Date().toISOString(),
              text_segment: text,
              source_type: isPartial ? "partial" : "final",
            };

            setHighlightedPortions((prev) => [...prev, highlightInfo]);
          }

          setGeneratedQuestions((prev) => {
            // Replace questions from same source type or add new ones
            const filtered = prev.filter(
              (q) => q.source !== (isPartial ? "partial" : "final")
            );
            return [...filtered, ...questionObjects];
          });

          console.log(
            `✅ Generated ${questionObjects.length} questions from ${
              isPartial ? "partial" : "final"
            } text`
          );
          return questionObjects;
        } else {
          console.error("❌ Question generation API error:", response.status);
          return [];
        }
      } catch (error) {
        console.error("❌ Question generation failed:", error);
        return [];
      } finally {
        setIsGeneratingQuestions(false);
      }
    },
    [isGeneratingQuestions, lastQuestionGeneration, currentSessionId]
  );

  // ✅ ENHANCED: Suggestion generation (improved)
  const generateSuggestionsFromTranscription = useCallback(
    async (text, retryCount = 0) => {
      if (!text || text.trim().length < MIN_TEXT_LENGTH) {
        console.log("⚠️ Text too short for suggestions:", text?.length || 0);
        return;
      }

      if (isGenerating) {
        console.log("⚠️ Already generating suggestions");
        return;
      }

      const truncatedText = truncateText(text);
      setIsGenerating(true);

      console.log(
        "🤖 Generating suggestions for:",
        truncatedText.substring(0, 50)
      );

      try {
        const requestBody = {
          patient_input: truncatedText.trim(),
          rag_type: "standard",
          include_partial: true,
          session_id: currentSessionId,
        };

        const response = await fetch(`${API_URL}/chat/suggest/patient`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const data = await response.json();
          const newSuggestions = data.suggestions || data.items || [];

          setSuggestions(newSuggestions);
          console.log("✅ Generated suggestions:", newSuggestions.length);
        } else {
          console.error("❌ Suggestion API error:", response.status);
          setSuggestions([]);
        }
      } catch (error) {
        console.error("❌ Suggestion generation failed:", error);
        setSuggestions([]);
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating, truncateText, currentSessionId]
  );

  // ✅ NEW: WebSocket connection management
  const setWebSocketConnection = useCallback((ws) => {
    setWebsocket(ws);
    setIsConnected(ws ? true : false);
    console.log(
      "WebSocket connection updated:",
      ws ? "connected" : "disconnected"
    );
  }, []);

  // ✅ NEW: Send question to patient via WebSocket
  const sendQuestionToPatient = useCallback(
    async (questionText, questionId) => {
      if (!websocket || !isConnected) {
        console.error("❌ Cannot send question: WebSocket not connected");
        return false;
      }

      try {
        const message = {
          type: "doctor_question",
          question: questionText,
          question_id: questionId,
          session_id: currentSessionId,
          timestamp: new Date().toISOString(),
        };

        websocket.send(JSON.stringify(message));
        console.log(
          "✅ Question sent to patient:",
          questionText.substring(0, 50)
        );
        return true;
      } catch (error) {
        console.error("❌ Failed to send question:", error);
        return false;
      }
    },
    [websocket, isConnected, currentSessionId]
  );

  // ✅ NEW: Get highlighted text portions for UI display
  const getHighlightedText = useCallback(
    (text, questionIds = []) => {
      if (!text || !highlightedPortions.length)
        return { highlighted: "", remaining: text };

      // Find relevant highlights
      const relevantHighlights = highlightedPortions.filter(
        (h) =>
          questionIds.length === 0 ||
          h.question_ids.some((id) => questionIds.includes(id))
      );

      if (relevantHighlights.length === 0)
        return { highlighted: "", remaining: text };

      // Get the first highlight (for simplicity)
      const highlight = relevantHighlights[0];
      const highlighted = text.substring(highlight.start, highlight.end);
      const remaining = text.substring(highlight.end);

      return { highlighted, remaining, highlight };
    },
    [highlightedPortions]
  );

  // ✅ ENHANCED: Clear function with session awareness
  const clearTranscription = useCallback(() => {
    console.log("🧹 Clearing all transcription data");

    setLiveTranscription("");
    setFinalTranscription("");
    setSuggestions([]);
    setGeneratedQuestions([]);
    setHighlightedPortions([]);
    setIsGenerating(false);
    setIsGeneratingQuestions(false);
    setCurrentSpeaker(null);
    setLastQuestionGeneration(null);

    // Keep session ID if recording is active
    if (!isRecording) {
      clearSession();
    }

    console.log("✅ Transcription data cleared");
  }, [isRecording, clearSession]);

  // ✅ NEW: Manual question generation for doctors
  const manualGenerateQuestions = useCallback(async () => {
    console.log("💡 Manual question generation triggered");

    const textToAnalyze =
      sessionTranscript || finalTranscription || liveTranscription;
    if (
      textToAnalyze &&
      textToAnalyze.trim().length >= MIN_QUESTION_TEXT_LENGTH
    ) {
      return await generateQuestionsFromText(textToAnalyze, false);
    } else {
      console.warn("⚠️ No sufficient text for manual question generation");
      return [];
    }
  }, [
    sessionTranscript,
    finalTranscription,
    liveTranscription,
    generateQuestionsFromText,
  ]);

  // ✅ EXISTING: Manual suggestion generation (enhanced)
  const manualGenerateSuggestions = useCallback(async () => {
    console.log("🤖 Manual suggestion generation triggered");

    const textToAnalyze =
      sessionTranscript || finalTranscription || liveTranscription;
    if (textToAnalyze && textToAnalyze.trim().length >= MIN_TEXT_LENGTH) {
      await generateSuggestionsFromTranscription(textToAnalyze);
    } else {
      console.warn("⚠️ No sufficient text for manual suggestions");
    }
  }, [
    sessionTranscript,
    finalTranscription,
    liveTranscription,
    generateSuggestionsFromTranscription,
  ]);

  // ✅ ENHANCED: Text statistics
  const getTextStats = useCallback(() => {
    return {
      liveLength: liveTranscription?.length || 0,
      finalLength: finalTranscription?.length || 0,
      sessionLength: sessionTranscript?.length || 0,
      maxLength: MAX_TRANSCRIPTION_LENGTH,
      isNearLimit:
        (sessionTranscript?.length || finalTranscription?.length || 0) >
        MAX_TRANSCRIPTION_LENGTH * 0.8,
      questionsCount: generatedQuestions.length,
      highlightsCount: highlightedPortions.length,
      currentSpeaker,
      currentMode: currentUserMode,
      sessionId: currentSessionId,
      isRecording,
    };
  }, [
    liveTranscription,
    finalTranscription,
    sessionTranscript,
    generatedQuestions,
    highlightedPortions,
    currentSpeaker,
    currentUserMode,
    currentSessionId,
    isRecording,
  ]);

  // ✅ Context value with all enhanced features
  const value = {
    // ✅ Core transcription states
    liveTranscription,
    finalTranscription,
    sessionTranscript,
    suggestions,
    isGenerating,

    // ✅ Session management
    currentSessionId,
    isRecording,
    sessionStartTime,
    startRecordingSession,
    stopRecordingSession,
    clearSession,

    // ✅ Speaker and user management
    currentSpeaker,
    setCurrentSpeaker,
    currentUserMode,
    setCurrentUserMode,
    isConnected,
    websocket,
    setWebSocketConnection,

    // ✅ Question management
    generatedQuestions,
    isGeneratingQuestions,
    highlightedPortions,
    generateQuestionsFromText,
    manualGenerateQuestions,
    sendQuestionToPatient,
    getHighlightedText,

    // ✅ Core functions
    updateTranscription,
    generateSuggestionsFromTranscription,
    manualGenerateSuggestions,
    clearTranscription,
    getTextStats,
    truncateText,

    // ✅ Constants
    maxLength: MAX_TRANSCRIPTION_LENGTH,
    minLength: MIN_TEXT_LENGTH,
    minQuestionLength: MIN_QUESTION_TEXT_LENGTH,
  };

  return (
    <TranscriptionContext.Provider value={value}>
      {children}
    </TranscriptionContext.Provider>
  );
};

export const useTranscription = () => {
  const context = useContext(TranscriptionContext);
  if (!context) {
    throw new Error(
      "useTranscription must be used within TranscriptionProvider"
    );
  }
  return context;
};
