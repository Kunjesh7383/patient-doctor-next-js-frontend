// hooks/doctor/useQuestionGeneration.js
import { useState, useCallback, useRef, useEffect } from "react";
import { API_URL } from "../../api";

const truncateText = (text, maxLength = 2000) => {
  if (!text || text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(" ");
  if (lastSpaceIndex > maxLength * 0.7) {
    return truncated.substring(0, lastSpaceIndex) + "...";
  }
  return truncated + "...";
};

export function useQuestionGeneration(
  currentUsername,
  {
    liveTranscription,
    currentSessionId,
    currentAnalysis,
    messages,
    onMessagesUpdate,
    onEventsUpdate,
    onAnalysisUpdate,
    onErrorAdd,
    onHighlightMessage,
  }
) {
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  // Create stable refs to prevent re-renders
  const onMessagesUpdateRef = useRef(onMessagesUpdate);
  const onEventsUpdateRef = useRef(onEventsUpdate);
  const onAnalysisUpdateRef = useRef(onAnalysisUpdate);
  const onErrorAddRef = useRef(onErrorAdd);
  const onHighlightMessageRef = useRef(onHighlightMessage);

  // Update refs when callbacks change
  useEffect(() => {
    onMessagesUpdateRef.current = onMessagesUpdate;
  }, [onMessagesUpdate]);
  useEffect(() => {
    onEventsUpdateRef.current = onEventsUpdate;
  }, [onEventsUpdate]);
  useEffect(() => {
    onAnalysisUpdateRef.current = onAnalysisUpdate;
  }, [onAnalysisUpdate]);
  useEffect(() => {
    onErrorAddRef.current = onErrorAdd;
  }, [onErrorAdd]);
  useEffect(() => {
    onHighlightMessageRef.current = onHighlightMessage;
  }, [onHighlightMessage]);

  const getInputTextForGeneration = useCallback(() => {
    if (liveTranscription && liveTranscription.trim().length >= 10) {
      return {
        text: liveTranscription,
        source: "live_transcription",
        sessionId: currentSessionId,
      };
    }

    const patientMessages = messages.filter(
      (msg) =>
        msg.role === "user" && msg.content && msg.content.trim().length >= 10
    );

    if (patientMessages.length === 0) {
      return null;
    }

    const lastPatientMessage = patientMessages[patientMessages.length - 1];

    return {
      text: lastPatientMessage.content,
      source: "patient_message",
      messageId: lastPatientMessage.message_id,
      sessionId: lastPatientMessage.session_id,
    };
  }, [liveTranscription, currentSessionId, messages]);

  // Using stable refs in dependencies
  const generateSuggestions = useCallback(async () => {
    console.log("💡 Manual question generation triggered");

    const inputData = getInputTextForGeneration();

    if (!inputData) {
      onErrorAddRef.current({
        type: "warning",
        title: "No Text Available",
        message:
          "Please wait for patient to speak or ensure there are patient messages available.",
      });
      return;
    }

    if (isGeneratingQuestions) {
      console.log("⚠️ Already generating questions, skipping");
      return;
    }

    setIsGeneratingQuestions(true);

    try {
      const truncatedText = truncateText(inputData.text, 1800);

      console.log("🎯 Generating questions for:", {
        source: inputData.source,
        textLength: truncatedText.length,
        sessionId: inputData.sessionId,
        messageId: inputData.messageId,
      });

      const response = await fetch(
        `${API_URL}/chat/suggest/${currentUsername}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patient_input: truncatedText,
            rag_type: "standard",
            include_partial: inputData.source === "live_transcription",
            current_analysis: currentAnalysis,
            source_type: inputData.source,
            generate_questions: true,
            save_questions_to_message: true,
            session_id: inputData.sessionId,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Question generation response:", data);

        if (data.items && data.items.length > 0) {
          let targetMessageIndex = -1;
          let targetMessageId = null;

          if (inputData.source === "patient_message" && inputData.messageId) {
            targetMessageIndex = messages.findIndex(
              (msg) => msg.message_id === inputData.messageId
            );
            targetMessageId = inputData.messageId;
            console.log(
              `🎯 Found target message: ${targetMessageIndex}, ID: ${targetMessageId}`
            );
          }

          if (targetMessageIndex === -1) {
            const patientMessages = messages.filter(
              (msg) => msg.role === "user"
            );
            if (patientMessages.length > 0) {
              const lastPatientMessage =
                patientMessages[patientMessages.length - 1];
              targetMessageIndex = messages.findIndex(
                (msg) => msg.message_id === lastPatientMessage.message_id
              );
              targetMessageId = lastPatientMessage.message_id;
              console.log(
                `🔄 Using last patient message: ${targetMessageIndex}, ID: ${targetMessageId}`
              );
            }
          }

          // Refresh messages to get saved questions
          const refreshResponse = await fetch(
            `${API_URL}/chat/history/${currentUsername}?t=${Date.now()}`,
            {
              method: "GET",
              headers: {
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
              },
            }
          );

          if (refreshResponse.ok) {
            const freshData = await refreshResponse.json();
            if (freshData.messages) {
              // Use stable ref
              onMessagesUpdateRef.current(freshData.messages);

              const newQuestionEvents = [];
              freshData.messages.forEach((message, index) => {
                if (
                  message.generated_questions &&
                  message.generated_questions.length > 0
                ) {
                  const questionsEvent = {
                    id: `questions-${
                      message.message_id || message.messageid
                    }-${Date.now()}`,
                    type: "questions",
                    title: `${message.generated_questions.length} AI Generated Questions`,
                    subtitle: "From Patient Message",
                    timestamp: message.timestamp || new Date().toISOString(),
                    questions: message.generated_questions.map((q, idx) => ({
                      text: q.text,
                      sent: false,
                      sending: false,
                      id: q.question_id || `q-${Date.now()}-${idx}`,
                    })),
                    messageId: message.message_id || message.messageid,
                    messageIndex: index,
                    sessionId: message.session_id,
                    priority:
                      message.generated_questions[0]?.analysis?.risk ||
                      "normal",
                    sourceType: "manual",
                    isNewlyGenerated: true,
                    isSaved: true,
                  };
                  newQuestionEvents.push(questionsEvent);
                }
              });

              // Use stable ref
              onEventsUpdateRef.current((prevEvents) => {
                const nonQuestionEvents = prevEvents.filter(
                  (e) => e.type !== "questions"
                );
                return [...nonQuestionEvents, ...newQuestionEvents];
              });

              console.log(
                "✅ Refreshed messages and events without scroll reset"
              );
            }
          }

          if (targetMessageId && onHighlightMessageRef.current) {
            onHighlightMessageRef.current(targetMessageId);
            setTimeout(() => onHighlightMessageRef.current(null), 8000);
          }

          if (data.analysis && onAnalysisUpdateRef.current) {
            onAnalysisUpdateRef.current(data.analysis, targetMessageId);
          }

          onErrorAddRef.current({
            type: "info",
            title: "Questions Generated Successfully",
            message: `Generated ${data.items.length} questions and saved to patient message.`,
          });

          console.log(`✅ Generated and saved ${data.items.length} questions`);
        } else {
          onErrorAddRef.current({
            type: "warning",
            title: "No Questions Generated",
            message:
              "The AI could not generate questions from the provided text.",
          });
        }
      } else {
        const errorText = await response.text();
        console.error(
          "❌ Question generation API error:",
          response.status,
          errorText
        );
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error("❌ Question generation failed:", error);
      onErrorAddRef.current({
        type: "error",
        title: "Question Generation Failed",
        message: "Failed to generate questions. Please try again.",
        details: error.message,
      });
    } finally {
      setIsGeneratingQuestions(false);
    }
  }, [
    currentUsername,
    getInputTextForGeneration,
    isGeneratingQuestions,
    currentAnalysis,
    messages,
  ]); // CRITICAL: Removed unstable callback references

  const generateQuestionsFromPartial = useCallback(
    async (partialText) => {
      if (!partialText || partialText.length < 20) return;

      console.log("Generating questions from partial transcription");

      try {
        const response = await fetch(
          `${API_URL}/generate_questions/${currentUsername}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              partial_text: truncateText(partialText, 1500),
              source_type: "partial",
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.questions && data.questions.length > 0) {
            const questionsEvent = {
              id: `partial-questions-${Date.now()}`,
              type: "questions",
              title: `${data.questions.length} Questions from Partial Speech`,
              subtitle: "Generated Mid-Speech",
              timestamp: new Date().toISOString(),
              questions: data.questions.map((q, idx) => ({
                ...q,
                id: q.question_id || `pq-${Date.now()}-${idx}`,
                sent: false,
                sending: false,
              })),
              sessionId: currentSessionId,
              sourceType: "live_transcription",
              priority: "normal",
              isNewlyGenerated: true,
              isSaved: false,
            };

            // Use stable ref
            onEventsUpdateRef.current((prevEvents) => [
              ...prevEvents,
              questionsEvent,
            ]);
            console.log("Generated questions from partial transcription");
          }
        }
      } catch (error) {
        console.error("Partial question generation failed:", error);
      }
    },
    [currentUsername, currentSessionId]
  );

  const canGenerateQuestions = useCallback(() => {
    if (isGeneratingQuestions) return false;

    const hasLiveTranscription =
      liveTranscription && liveTranscription.trim().length >= 10;
    const hasPatientMessages =
      messages.filter((msg) => msg.role === "user").length > 0;

    return hasLiveTranscription || hasPatientMessages;
  }, [isGeneratingQuestions, liveTranscription, messages]);

  const getGenerateButtonText = useCallback(() => {
    if (isGeneratingQuestions) return "Generating...";

    const hasLiveTranscription =
      liveTranscription && liveTranscription.trim().length >= 10;
    const hasPatientMessages =
      messages.filter((msg) => msg.role === "user").length > 0;

    if (hasLiveTranscription) {
      return `Generate from Live (${liveTranscription.length} chars)`;
    } else if (hasPatientMessages) {
      return "Generate from Message";
    } else {
      return "No patient text available";
    }
  }, [isGeneratingQuestions, liveTranscription, messages]);

  return {
    isGeneratingQuestions,
    generateSuggestions,
    generateQuestionsFromPartial,
    getInputTextForGeneration,
    canGenerateQuestions,
    getGenerateButtonText,
  };
}
