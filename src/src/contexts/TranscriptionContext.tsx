import React, { createContext, useContext, useState, useCallback } from "react";
import { API_URL } from "../api";

type Speaker = "patient" | "doctor" | null;
type UserMode = "patient" | "doctor";

export interface GeneratedQuestion {
  id: string;
  text: string;
  source: "partial" | "final";
  timestamp: string;
  sourceText: string;
  sessionId: string | null;
  used_portion?: [number, number];
  generated_from?: "partial" | "final";
}

export interface HighlightInfo {
  start: number;
  end: number;
  reason: string;
  question_ids: string[];
  timestamp: string;
  text_segment: string;
  source_type: "partial" | "final";
}

export interface TranscriptionContextValue {
  // Core transcription states
  liveTranscription: string;
  finalTranscription: string;
  sessionTranscript: string;
  suggestions: string[];
  isGenerating: boolean;

  // Session management
  currentSessionId: string | null;
  isRecording: boolean;
  sessionStartTime: string | null;
  startRecordingSession: () => string;
  stopRecordingSession: () => {
    sessionId: string | null;
    finalText: string;
    questions: GeneratedQuestion[];
    highlights: HighlightInfo[];
    endTime: string;
  };
  clearSession: () => void;

  // Speaker and user management
  currentSpeaker: Speaker;
  setCurrentSpeaker: (s: Speaker) => void;
  currentUserMode: UserMode;
  setCurrentUserMode: (m: UserMode) => void;
  isConnected: boolean;
  websocket: WebSocket | null;
  setWebSocketConnection: (ws: WebSocket | null) => void;

  // Question management
  generatedQuestions: GeneratedQuestion[];
  isGeneratingQuestions: boolean;
  highlightedPortions: HighlightInfo[];
  generateQuestionsFromText: (text: string, isPartial?: boolean) => Promise<GeneratedQuestion[]>;
  manualGenerateQuestions: () => Promise<GeneratedQuestion[]>;
  sendQuestionToPatient: (questionText: string, questionId?: string) => Promise<boolean>;
  getHighlightedText: (
    text: string,
    questionIds?: string[]
  ) => { highlighted: string; remaining: string; highlight?: HighlightInfo };

  // Core functions
  updateTranscription: (text: string, speaker: Speaker, messageType?: "partial" | "final") => void;
  generateSuggestionsFromTranscription: (text: string) => Promise<void>;
  manualGenerateSuggestions: () => Promise<void>;
  clearTranscription: () => void;
  getTextStats: () => {
    liveLength: number;
    finalLength: number;
    sessionLength: number;
    maxLength: number;
    isNearLimit: boolean;
    questionsCount: number;
    highlightsCount: number;
    currentSpeaker: Speaker;
    currentMode: UserMode;
    sessionId: string | null;
    isRecording: boolean;
  };
  truncateText: (text: string, maxLength?: number) => string;

  // Constants
  maxLength: number;
  minLength: number;
  minQuestionLength: number;
}

const TranscriptionContext = createContext<TranscriptionContextValue | null>(null);

export const TranscriptionProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [liveTranscription, setLiveTranscription] = useState("");
  const [finalTranscription, setFinalTranscription] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionTranscript, setSessionTranscript] = useState("");

  const [currentSpeaker, setCurrentSpeaker] = useState<Speaker>(null);
  const [currentUserMode, setCurrentUserMode] = useState<UserMode>("patient");
  const [isConnected, setIsConnected] = useState(false);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [highlightedPortions, setHighlightedPortions] = useState<HighlightInfo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [lastQuestionGeneration, setLastQuestionGeneration] = useState<number | null>(null);

  const MAX_TRANSCRIPTION_LENGTH = 200;
  const MIN_TEXT_LENGTH = 5;
  const MIN_QUESTION_TEXT_LENGTH = 10;
  const QUESTION_GENERATION_THROTTLE = 3000;

  const truncateText = useCallback((text: string, maxLength: number = MAX_TRANSCRIPTION_LENGTH) => {
    if (!text || text.length <= maxLength) return text;
    const truncated = text.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(" ");
    if (lastSpaceIndex > maxLength * 0.8) {
      return truncated.substring(0, lastSpaceIndex);
    }
    return truncated;
  }, []);

  const startRecordingSession = useCallback(() => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCurrentSessionId(sessionId);
    setSessionTranscript("");
    setIsRecording(true);
    setSessionStartTime(new Date().toISOString());
    setGeneratedQuestions([]);
    setHighlightedPortions([]);
    return sessionId;
  }, []);

  const stopRecordingSession = useCallback(() => {
    setIsRecording(false);
    const finalSessionData = {
      sessionId: currentSessionId,
      finalText: sessionTranscript,
      questions: generatedQuestions,
      highlights: highlightedPortions,
      endTime: new Date().toISOString(),
    };
    return finalSessionData;
  }, [currentSessionId, sessionTranscript, generatedQuestions, highlightedPortions]);

  const clearSession = useCallback(() => {
    setCurrentSessionId(null);
    setSessionTranscript("");
    setIsRecording(false);
    setSessionStartTime(null);
    setGeneratedQuestions([]);
    setHighlightedPortions([]);
  }, []);

  const updateTranscription = useCallback(
    (text: string, speaker: Speaker, messageType: "partial" | "final" = "partial") => {
      if (speaker && speaker !== currentSpeaker) {
        setCurrentSpeaker(speaker);
      }

      const truncatedText = truncateText(text);

      if (messageType === "final" && speaker === "patient" && isRecording) {
        setSessionTranscript((prev) => (prev ? `${prev} ${truncatedText}` : truncatedText));
      }

      if (currentUserMode === "doctor") {
        if (speaker === "patient") {
          setLiveTranscription(truncatedText);
        }
      } else if (currentUserMode === "patient") {
        if (speaker === "doctor") {
          setLiveTranscription(truncatedText);
        } else if (speaker === "patient") {
          setLiveTranscription("");
        }
      }

      if (messageType === "final") {
        setFinalTranscription(truncatedText);
        if (speaker === "patient" && truncatedText?.length >= MIN_TEXT_LENGTH) {
          setTimeout(() => {
            void generateSuggestionsFromTranscription(truncatedText);
          }, 300);
        }
      }

      if (speaker === "patient" && truncatedText?.length >= MIN_QUESTION_TEXT_LENGTH && currentUserMode === "doctor") {
        const isPartial = messageType === "partial";
        const now = Date.now();
        if (!lastQuestionGeneration || now - lastQuestionGeneration >= QUESTION_GENERATION_THROTTLE) {
          setTimeout(() => {
            void generateQuestionsFromText(truncatedText, isPartial);
          }, isPartial ? 2000 : 500);
        }
      }
    },
    [currentSpeaker, currentUserMode, isRecording, truncateText, lastQuestionGeneration]
  );

  const generateQuestionsFromText = useCallback(
    async (text: string, isPartial: boolean = false): Promise<GeneratedQuestion[]> => {
      if (!text || text.trim().length < MIN_QUESTION_TEXT_LENGTH) {
        return [];
      }

      const now = Date.now();
      if (isPartial && lastQuestionGeneration && now - lastQuestionGeneration < QUESTION_GENERATION_THROTTLE) {
        return [];
      }
      if (isGeneratingQuestions) return [];

      setIsGeneratingQuestions(true);
      setLastQuestionGeneration(now);

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
          const questions: string[] = data.questions || data.items || [];

          const questionObjects: GeneratedQuestion[] = questions.map((q: string, index: number) => ({
            id: `${isPartial ? "partial" : "final"}_${now}_${index}`,
            text: q,
            source: isPartial ? "partial" : "final",
            timestamp: new Date().toISOString(),
            sourceText: text,
            sessionId: currentSessionId,
            used_portion: [0, text.length],
            generated_from: isPartial ? "partial" : "final",
          }));

          if (questionObjects.length > 0) {
            const highlightInfo: HighlightInfo = {
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
            const filtered = prev.filter((q) => q.source !== (isPartial ? "partial" : "final"));
            return [...filtered, ...questionObjects];
          });
          return questionObjects;
        }
        return [];
      } catch {
        return [];
      } finally {
        setIsGeneratingQuestions(false);
      }
    },
    [isGeneratingQuestions, lastQuestionGeneration, currentSessionId]
  );

  const generateSuggestionsFromTranscription = useCallback(async (text: string) => {
    if (!text || text.trim().length < MIN_TEXT_LENGTH) return;
    if (isGenerating) return;
    const truncatedText = truncateText(text);
    setIsGenerating(true);
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
        const newSuggestions: string[] = data.suggestions || data.items || [];
        setSuggestions(newSuggestions);
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, truncateText, currentSessionId]);

  const setWebSocketConnection = useCallback((ws: WebSocket | null) => {
    setWebsocket(ws);
    setIsConnected(Boolean(ws));
  }, []);

  const sendQuestionToPatient = useCallback(async (questionText: string, questionId?: string) => {
    if (!websocket || !isConnected) return false;
    try {
      const message = {
        type: "doctor_question",
        question: questionText,
        question_id: questionId,
        session_id: currentSessionId,
        timestamp: new Date().toISOString(),
      };
      websocket.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }, [websocket, isConnected, currentSessionId]);

  const getHighlightedText = useCallback(
    (
      text: string,
      questionIds: string[] = []
    ): { highlighted: string; remaining: string; highlight?: HighlightInfo } => {
      if (!text || !highlightedPortions.length) return { highlighted: "", remaining: text };
      const relevantHighlights = highlightedPortions.filter(
        (h) => questionIds.length === 0 || h.question_ids.some((id) => questionIds.includes(id))
      );
      if (relevantHighlights.length === 0) return { highlighted: "", remaining: text };
      const highlight = relevantHighlights[0];
      const highlighted = text.substring(highlight.start, highlight.end);
      const remaining = text.substring(highlight.end);
      return { highlighted, remaining, highlight };
    },
    [highlightedPortions]
  );

  const clearTranscription = useCallback(() => {
    setLiveTranscription("");
    setFinalTranscription("");
    setSuggestions([]);
    setGeneratedQuestions([]);
    setHighlightedPortions([]);
    setIsGenerating(false);
    setIsGeneratingQuestions(false);
    setCurrentSpeaker(null);
    setLastQuestionGeneration(null);
    if (!isRecording) {
      clearSession();
    }
  }, [isRecording, clearSession]);

  const manualGenerateQuestions = useCallback(async () => {
    const textToAnalyze = sessionTranscript || finalTranscription || liveTranscription;
    if (textToAnalyze && textToAnalyze.trim().length >= MIN_QUESTION_TEXT_LENGTH) {
      return await generateQuestionsFromText(textToAnalyze, false);
    }
    return [];
  }, [sessionTranscript, finalTranscription, liveTranscription, generateQuestionsFromText]);

  const manualGenerateSuggestions = useCallback(async () => {
    const textToAnalyze = sessionTranscript || finalTranscription || liveTranscription;
    if (textToAnalyze && textToAnalyze.trim().length >= MIN_TEXT_LENGTH) {
      await generateSuggestionsFromTranscription(textToAnalyze);
    }
  }, [sessionTranscript, finalTranscription, liveTranscription, generateSuggestionsFromTranscription]);

  const getTextStats = useCallback(() => {
    return {
      liveLength: liveTranscription?.length || 0,
      finalLength: finalTranscription?.length || 0,
      sessionLength: sessionTranscript?.length || 0,
      maxLength: MAX_TRANSCRIPTION_LENGTH,
      isNearLimit: (sessionTranscript?.length || finalTranscription?.length || 0) > MAX_TRANSCRIPTION_LENGTH * 0.8,
      questionsCount: generatedQuestions.length,
      highlightsCount: highlightedPortions.length,
      currentSpeaker,
      currentMode: currentUserMode,
      sessionId: currentSessionId,
      isRecording,
    };
  }, [liveTranscription, finalTranscription, sessionTranscript, generatedQuestions, highlightedPortions, currentSpeaker, currentUserMode, currentSessionId, isRecording]);

  const value: TranscriptionContextValue = {
    liveTranscription,
    finalTranscription,
    sessionTranscript,
    suggestions,
    isGenerating,
    currentSessionId,
    isRecording,
    sessionStartTime,
    startRecordingSession,
    stopRecordingSession,
    clearSession,
    currentSpeaker,
    setCurrentSpeaker,
    currentUserMode,
    setCurrentUserMode,
    isConnected,
    websocket,
    setWebSocketConnection,
    generatedQuestions,
    isGeneratingQuestions,
    highlightedPortions,
    generateQuestionsFromText,
    manualGenerateQuestions,
    sendQuestionToPatient,
    getHighlightedText,
    updateTranscription,
    generateSuggestionsFromTranscription,
    manualGenerateSuggestions,
    clearTranscription,
    getTextStats,
    truncateText,
    maxLength: MAX_TRANSCRIPTION_LENGTH,
    minLength: MIN_TEXT_LENGTH,
    minQuestionLength: MIN_QUESTION_TEXT_LENGTH,
  };

  return (
    <TranscriptionContext.Provider value={value}>{children}</TranscriptionContext.Provider>
  );
};

export const useTranscription = () => {
  const context = useContext(TranscriptionContext);
  if (!context) {
    throw new Error("useTranscription must be used within TranscriptionProvider");
  }
  return context;
};


