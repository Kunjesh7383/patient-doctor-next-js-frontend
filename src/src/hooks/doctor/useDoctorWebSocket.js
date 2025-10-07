// hooks/doctor/useDoctorWebSocket.js
import { useState, useEffect, useCallback, useRef } from "react";
import { WS_URL, API_URL } from "../../api";

export function useDoctorWebSocket(
  currentUsername,
  { onMessagesUpdate, onEventsUpdate, onAnalysisUpdate, onErrorAdd, messages }
) {
  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [doctorWebSocket, setDoctorWebSocket] = useState(null);
  const [liveTranscription, setLiveTranscription] = useState("");
  const [currentSpeaker, setCurrentSpeaker] = useState("patient");
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Stable refs to prevent WebSocket reconnections
  const onMessagesUpdateRef = useRef(onMessagesUpdate);
  const onEventsUpdateRef = useRef(onEventsUpdate);
  const onAnalysisUpdateRef = useRef(onAnalysisUpdate);
  const onErrorAddRef = useRef(onErrorAdd);

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

  const createInitialEventsFromSavedQuestions = useCallback((messages) => {
    console.log("Creating events from saved questions");
    const questionEvents = [];

    messages.forEach((message, index) => {
      if (
        message.generated_questions &&
        message.generated_questions.length > 0
      ) {
        if (!message.message_id) {
          message.message_id = `msg-${message.timestamp}-${index}`;
        }

        const questionsEvent = {
          id: `questions-for-${message.message_id}`,
          type: "questions",
          title: `${message.generated_questions.length} Question${
            message.generated_questions.length > 1 ? "s" : ""
          }`,
          subtitle: "Generated Questions",
          timestamp: message.timestamp,
          questions: message.generated_questions.map((q, qIdx) => ({
            id: q.question_id || `q-${message.message_id}-${qIdx}`,
            text: q.text,
            sent: false,
            sending: false,
          })),
          messageId: message.message_id,
          messageIndex: index,
          sessionId: message.session_id,
          sourceType: "saved",
          isNewlyGenerated: false,
          isSaved: true,
        };

        questionEvents.push(questionsEvent);
      }
    });

    return questionEvents;
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!currentUsername) return;

    console.log("🔄 Fetching messages for", currentUsername);
    setIsLoadingMessages(true);

    try {
      const response = await fetch(
        `${API_URL}/chat/history/${currentUsername}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Messages loaded:", data.messages?.length || 0);

        const fetchedMessages = data.messages || [];
        onMessagesUpdateRef.current(fetchedMessages);

        // Create initial events from saved questions
        const initialEvents =
          createInitialEventsFromSavedQuestions(fetchedMessages);
        console.log(
          "Created",
          initialEvents.length,
          "initial question events from saved questions"
        );
        onEventsUpdateRef.current(initialEvents);
      } else {
        console.error("Fetch failed:", response.status);
        onMessagesUpdateRef.current([]);
        onEventsUpdateRef.current([]);
      }
    } catch (error) {
      console.error("Fetch error:", error.message);
      onMessagesUpdateRef.current([]);
      onEventsUpdateRef.current([]);
    }

    setIsLoadingMessages(false);
  }, [currentUsername, createInitialEventsFromSavedQuestions]);

  // MAIN DOCTOR WEBSOCKET
  useEffect(() => {
    if (!currentUsername) return;

    const wsUrl = `${WS_URL}/ws/doctor/${currentUsername}`;
    console.log("🩺 Doctor connecting to dedicated endpoint:", wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("✅ Doctor WebSocket connected");
      setIsConnected(true);
      setDoctorWebSocket(ws);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📨 Doctor WebSocket received:", data.type, data);

        // Live transcription handling
        if (data.type === "partial" && data.speaker === "patient") {
          setLiveTranscription(data.text);
          setCurrentSpeaker("patient");
          setCurrentSessionId(data.session_id || null);
        }

        // Final transcription handling
        if (data.type === "final" && data.speaker === "patient") {
          console.log(
            "✅ Doctor received patient's final transcription:",
            data.text
          );

          const newMessage = {
            message_id: data.session_id
              ? `${data.session_id}_final`
              : `transcript_${Date.now()}`,
            role: "user",
            content: data.text.trim(),
            timestamp: data.server_ts || new Date().toISOString(),
            sender: "patient",
            turn_id: data.turn_id,
            session_id: data.session_id,
            generated_questions: [],
            highlighted_portions: [],
            metadata: {
              session_id: data.session_id,
              generated_questions: [],
              highlighted_portions: [],
            },
          };

          onMessagesUpdateRef.current((prevMessages) => {
            const isDuplicate = prevMessages.some(
              (msg) =>
                msg.content === data.text.trim() &&
                msg.role === "user" &&
                msg.session_id === data.session_id
            );

            if (!isDuplicate) {
              console.log(
                "📝 Adding patient's final transcription to doctor view"
              );
              return [...prevMessages, newMessage];
            }
            return prevMessages;
          });

          setLiveTranscription("");
          setCurrentSessionId(null);
        }

        // Session finalized
        if (data.type === "session_finalized") {
          console.log("🎯 Session finalized:", data.session_id);

          onMessagesUpdateRef.current((prevMessages) =>
            prevMessages.map((msg) =>
              msg.session_id === data.session_id
                ? {
                    ...msg,
                    metadata: {
                      ...msg.metadata,
                      questions_count: data.questions_count,
                      finalized: true,
                    },
                  }
                : msg
            )
          );

          // Refresh to get saved questions from database
          setTimeout(() => fetchMessages(), 200);
        }

        // AI suggestions handling
        if (data.type === "suggestion") {
          console.log("🤖 Doctor received AI suggestions:", data);

          const questionsEvent = {
            id: `questions-${Date.now()}`,
            type: "questions",
            title: `${data.items?.length || 0} Questions Generated`,
            subtitle: "From AI Analysis",
            timestamp: new Date().toISOString(),
            questions: (data.items || []).map((item, idx) => ({
              text: item.trim(),
              sent: false,
              sending: false,
              id: `q-${Date.now()}-${idx}`,
            })),
            messageId: data.origin_turn_id,
            sessionId: data.session_id,
            sourceType: data.source || "auto",
            priority: data.analysis?.risk || "normal",
            isNewlyGenerated: true,
            isSaved: false,
          };

          onEventsUpdateRef.current((prevEvents) => [
            ...prevEvents,
            questionsEvent,
          ]);

          if (data.analysis) {
            onAnalysisUpdateRef.current(data.analysis, data.origin_turn_id);
          }
        }

        // Auto suggestion handling
        if (data.type === "auto_suggestion") {
          console.log("✅ Auto-suggestion received, refreshing entire chat");
          setTimeout(() => fetchMessages(), 200);

          onErrorAddRef.current({
            type: "info",
            title: "🤖 Auto-Generated Question",
            message: "New question generated, refreshing chat...",
          });
        }

        // Manual suggestion handling
        if (data.type === "manual_suggestion") {
          console.log("🔧 Doctor received manual suggestion:", data);
          setTimeout(() => fetchMessages(), 500);

          if (data.analysis && Object.keys(data.analysis).length > 0) {
            onAnalysisUpdateRef.current(
              data.analysis,
              data.question.message_id
            );
          }

          onErrorAddRef.current({
            type: "info",
            title: "🔧 Manual Question Generated",
            message: `Question will appear shortly: "${data.question.text.substring(
              0,
              50
            )}..."`,
          });
        }

        // Question confirmations
        if (data.type === "question_sent_confirmation") {
          console.log(
            "✅ Question sent confirmation received:",
            data.question_id
          );

          onEventsUpdateRef.current((prevEvents) =>
            prevEvents.map((event) => ({
              ...event,
              questions: event.questions?.map((q) =>
                q.id === data.question_id
                  ? { ...q, sending: false, sent: true }
                  : q
              ),
            }))
          );

          if (data.message_saved) {
            onErrorAddRef.current({
              type: "info",
              title: "Question Sent Successfully",
              message:
                "Question has been saved and will be visible to patient.",
            });
          }
        }

        if (data.type === "question_send_failed") {
          console.log("❌ Question send failed:", data.question_id);

          onEventsUpdateRef.current((prevEvents) =>
            prevEvents.map((event) => ({
              ...event,
              questions: event.questions?.map((q) =>
                q.id === data.question_id
                  ? { ...q, sending: false, sent: data.message_saved || false }
                  : q
              ),
            }))
          );

          if (data.message_saved && !data.patient_notified) {
            onErrorAddRef.current({
              type: "warning",
              title: "Question Saved But Patient Not Notified",
              message:
                "Question was saved successfully but patient is not currently connected.",
            });
          } else if (!data.message_saved) {
            onErrorAddRef.current({
              type: "error",
              title: "Failed to Send Question",
              message: data.error || "Could not save or send question.",
            });
          }
        }
      } catch (error) {
        console.error("❌ Doctor WebSocket message error:", error);
      }
    };

    ws.onclose = () => {
      console.log("🔌 Doctor WebSocket disconnected");
      setIsConnected(false);
      setDoctorWebSocket(null);
      setLiveTranscription("");
      setCurrentSessionId(null);
    };

    ws.onerror = (error) => {
      console.error("❌ Doctor WebSocket error:", error);
      setIsConnected(false);
      onErrorAddRef.current({
        type: "error",
        title: "WebSocket Connection Error",
        message: "Failed to connect to real-time transcription stream.",
      });
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      setDoctorWebSocket(null);
      setIsConnected(false);
    };
  }, [currentUsername]);
  // CHAT HISTORY WEBSOCKET
  useEffect(() => {
    if (!currentUsername) return;

    const chatWsUrl = `${WS_URL}/ws/chat_history/${currentUsername}`;
    console.log("🩺 Doctor connecting to chat history:", chatWsUrl);

    const chatWs = new WebSocket(chatWsUrl);

    chatWs.onopen = () => {
      console.log("✅ Doctor chat history WebSocket connected");
      setIsLoadingMessages(false);
    };

    chatWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📨 Doctor received chat update:", data.type);

        if (data.type === "initial_history") {
          console.log(
            `📜 Loading ${data.messages?.length || 0} initial messages`
          );
          onMessagesUpdateRef.current(data.messages || []);

          // Process saved questions from messages
          const initialEvents = createInitialEventsFromSavedQuestions(
            data.messages || []
          );
          onEventsUpdateRef.current(initialEvents);
        } else if (data.type === "new_message") {
          console.log(
            `➕ Doctor sees new message: ${data.message?.content?.substring(
              0,
              30
            )}...`
          );

          // This triggers backend auto-generation!
          onMessagesUpdateRef.current((prev) => {
            // Prevent duplicates
            const exists = prev.some(
              (msg) =>
                msg.content === data.message.content &&
                msg.role === data.message.role &&
                Math.abs(
                  new Date(msg.timestamp).getTime() -
                    new Date(data.message.timestamp).getTime()
                ) < 2000
            );

            return exists ? prev : [...prev, data.message];
          });
        } else if (data.type === "history_refresh") {
          console.log(
            `🔄 Doctor refreshing ${data.messages?.length || 0} messages`
          );
          onMessagesUpdateRef.current(data.messages || []);

          // Refresh question events
          const refreshedEvents = createInitialEventsFromSavedQuestions(
            data.messages || []
          );
          onEventsUpdateRef.current(refreshedEvents);
        }
      } catch (error) {
        console.error("❌ Error parsing chat WebSocket message:", error);
      }
    };

    chatWs.onclose = () => {
      console.log("🔌 Doctor chat history WebSocket closed");
    };

    chatWs.onerror = (error) => {
      console.error("❌ Doctor chat history WebSocket error:", error);
    };

    return () => {
      if (chatWs.readyState === WebSocket.OPEN) {
        chatWs.close();
      }
    };
  }, [currentUsername]);

  // Function To Send Questions
  const sendQuestion = useCallback(
    async (question, messageIndex) => {
      console.log("Sending question:", question.text, "ID:", question.id);

      if (question.sending || question.sent) {
        console.log("Question already sending or sent, skipping");
        return;
      }

      try {
        if (!doctorWebSocket || doctorWebSocket.readyState !== WebSocket.OPEN) {
          throw new Error("WebSocket not connected");
        }

        // Immediately mark as sending
        onEventsUpdateRef.current((prevEvents) =>
          prevEvents.map((event) => ({
            ...event,
            questions: event.questions?.map((q) =>
              q.id === question.id ? { ...q, sending: true } : q
            ),
          }))
        );

        // Add to messages immediately (Commented this to avoid duplication sent questions appearing in the chat container)
        // onMessagesUpdateRef.current((prevMessages) => {
        //   const newDoctorMessage = {
        //     message_id: `doctor-q-${question.id}-${Date.now()}`,
        //     role: "doctor",
        //     content: `Question: ${question.text}`,
        //     timestamp: new Date().toISOString(),
        //     sender: "doctor",
        //     metadata: {
        //       isDoctorQuestion: true,
        //       questionId: question.id,
        //       messageType: "doctor_question",
        //       source: "doctor_interface",
        //     },
        //   };

        //   return [...prevMessages, newDoctorMessage];
        // });

        // Send via WebSocket
        const messagePayload = {
          type: "doctor_question",
          question: question.text,
          question_id: question.id,
          timestamp: new Date().toISOString(),
          message_index: messageIndex,
          patient_id: currentUsername,
          session_id: currentSessionId,
        };

        doctorWebSocket.send(JSON.stringify(messagePayload));
        console.log("Question sent via WebSocket, waiting for confirmation...");

        // Mark as sent after brief delay
        setTimeout(() => {
          onEventsUpdateRef.current((prevEvents) =>
            prevEvents.map((event) => ({
              ...event,
              questions: event.questions?.map((q) =>
                q.id === question.id ? { ...q, sending: false, sent: true } : q
              ),
            }))
          );
        }, 100);
      } catch (error) {
        console.error("Failed to send question:", error);

        // Reset on error
        onEventsUpdateRef.current((prevEvents) =>
          prevEvents.map((event) => ({
            ...event,
            questions: event.questions?.map((q) =>
              q.id === question.id ? { ...q, sending: false, sent: false } : q
            ),
          }))
        );

        onErrorAddRef.current({
          type: "error",
          title: "Failed to Send Question",
          message: "Could not send question. Please try again.",
        });
      }
    },
    [doctorWebSocket, currentUsername, currentSessionId]
  );

  return {
    isConnected,
    doctorWebSocket,
    liveTranscription,
    currentSpeaker,
    currentSessionId,
    isLoadingMessages,
    sendQuestion,
    fetchMessages,
  };
}
