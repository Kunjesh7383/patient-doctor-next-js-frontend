// components/PatientChatContainer.jsx
import React, { useState, useRef, useEffect } from "react";
import { ROLES } from "../constants";
import { useTranscription } from "../contexts/TranscriptionContext";
import { API_URL } from "../api";
import MessageBubble from "./MessageBubble";
import SpeakingIndicator from "./SpeakingIndicator";
import Footer from "./Footer";
import EmptyState from "./EmptyState";
import "../styles/PatientChatContainer.css";

export default function PatientChatContainer({
  messages: initialMessages = [],
  liveTranscription,
  isRecording,
  toggleRecording,
  currentUsername,
  transcriptionContext,
}) {
  const scrollContainerRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [lastSeenMessageIndex, setLastSeenMessageIndex] = useState(-1);

  // ✅ Session-aware message management
  // const [messages, setMessages] = useState(initialMessages);
  const messages = initialMessages;
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // ✅ ENHANCED: Question reception with session awareness
  const [incomingQuestions, setIncomingQuestions] = useState([]);
  const [unreadQuestions, setUnreadQuestions] = useState(0);
  const [questionHistory, setQuestionHistory] = useState([]);

  const [nearTokenLimit, setNearTokenLimit] = useState(false);

  // Backend compatibility limits
  const MAX_CHARS_FOR_BACKEND = 1800;
  const WARNING_THRESHOLD_CHARS = 1400;

  // ✅ ENHANCED: Get enhanced transcription context with session support
  const {
    liveTranscription: contextLiveTranscription,
    finalTranscription,
    sessionTranscript,
    currentSessionId,
    isGenerating,
    suggestions,
    generatedQuestions,
    currentSpeaker,
    setCurrentSpeaker,
    currentUserMode,
    setCurrentUserMode,
    isConnected,
    setWebSocketConnection,
    isRecording: contextIsRecording,
    startRecordingSession,
    stopRecordingSession,
  } = useTranscription();

  // ✅ CRITICAL: Patient NEVER sees self-transcription, only doctor transcription
  const shouldShowLiveTranscription =
    !isRecording && // Patient is NOT recording
    contextLiveTranscription && // There is live transcription
    currentSpeaker === "doctor" && // Doctor is speaking
    currentUserMode === "patient"; // We're in patient mode

  // ✅ CRITICAL: Only show doctor transcription to patient
  const displayTranscription = shouldShowLiveTranscription
    ? contextLiveTranscription
    : "";

  // ✅ NEW: Set user mode to patient on component mount
  useEffect(() => {
    setCurrentUserMode("patient");
    console.log("👤 PatientChatContainer: Set user mode to patient");
  }, [setCurrentUserMode]);

  // ✅ ENHANCED: WebSocket message handler with session support
  useEffect(() => {
    if (transcriptionContext?.websocket) {
      const handleMessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "doctor_question") {
            console.log(
              "📩 Patient received question from doctor:",
              data.question
            );

            const newQuestion = {
              id: data.question_id || `q-${Date.now()}`,
              text: data.question,
              timestamp: data.timestamp || new Date().toISOString(),
              sessionId: data.session_id,
              eventId: data.event_id,
              isRead: false,
              source: "doctor",
            };

            setIncomingQuestions((prev) => [...prev, newQuestion]);
            setUnreadQuestions((prev) => prev + 1);

            // Add to question history for tracking
            setQuestionHistory((prev) => [...prev, newQuestion]);

            // Auto-scroll to show new question
            if (isAtBottom) {
              setTimeout(() => scrollToBottom(), 100);
            }
          } else if (data.type === "doctor_reply") {
            console.log("💬 Patient received doctor reply:", data.text);
            // Refresh messages to show new doctor reply
            setTimeout(() => fetchMessages(), 500);
          } else if (data.type === "session_finalized") {
            console.log("✅ Patient notified: session finalized");
            // Refresh messages to show finalized transcript
            setTimeout(() => fetchMessages(), 1000);
          } else if (data.type === "partial") {
            // ✅ CRITICAL: Only update speaker if it's doctor speaking
            if (data.speaker === "doctor") {
              setCurrentSpeaker("doctor");
              console.log(
                "🩺 Doctor started speaking (patient hears live transcription)"
              );
            }
            // ✅ Patient partial transcription is IGNORED (no self-transcription)
          } else if (data.type === "final") {
            // ✅ Handle final transcription from doctor
            if (data.speaker === "doctor") {
              setCurrentSpeaker("doctor");
              setTimeout(() => setCurrentSpeaker(null), 3000);
              console.log("🩺 Doctor finished speaking");
            }
            // ✅ Patient final transcription handled by session system
          }
        } catch (error) {
          console.error("❌ Error parsing WebSocket message:", error);
        }
      };

      transcriptionContext.websocket.addEventListener("message", handleMessage);
      setWebSocketConnection(transcriptionContext.websocket);

      return () => {
        transcriptionContext.websocket.removeEventListener(
          "message",
          handleMessage
        );
      };
    }
  }, [
    transcriptionContext?.websocket,
    isAtBottom,
    setCurrentSpeaker,
    setWebSocketConnection,
  ]);

  // ✅ Mark questions as read when scrolled to
  useEffect(() => {
    if (isAtBottom && unreadQuestions > 0) {
      setIncomingQuestions((prev) => prev.map((q) => ({ ...q, isRead: true })));
      setUnreadQuestions(0);
    }
  }, [isAtBottom, unreadQuestions]);

  // ✅ ENHANCED: Update speaker when patient starts/stops recording with session support
  useEffect(() => {
    if (isRecording) {
      setCurrentSpeaker("patient");
      // Start recording session if not already started
      if (!contextIsRecording && !currentSessionId) {
        const sessionId = startRecordingSession();
        console.log("🎤 Patient started recording session:", sessionId);
      }
    } else {
      // Stop recording session if it was active
      if (contextIsRecording && currentSessionId) {
        const sessionData = stopRecordingSession();
        console.log("🛑 Patient stopped recording session:", sessionData);
      }
      setTimeout(() => setCurrentSpeaker(null), 2000);
    }
  }, [
    isRecording,
    setCurrentSpeaker,
    contextIsRecording,
    currentSessionId,
    startRecordingSession,
    stopRecordingSession,
  ]);

  // ✅ EXISTING: Message fetching (unchanged but enhanced logging)
  // const fetchMessages = async () => {
  //   if (!currentUsername) {
  //     console.warn("⚠️ No username provided for fetching messages");
  //     return;
  //   }

  //   if (isLoadingMessages) {
  //     console.log("📝 Already loading messages, skipping...");
  //     return;
  //   }

  //   console.log(`🔄 Fetching messages for patient ${currentUsername}`);
  //   setIsLoadingMessages(true);

  //   try {
  //     const response = await fetch(
  //       `${API_URL}/chat/history/${currentUsername}`,
  //       {
  //         method: "GET",
  //         headers: { "Content-Type": "application/json" },
  //       }
  //     );

  //     if (response.ok) {
  //       const data = await response.json();
  //       const fetchedMessages = data.messages || [];

  //       console.log(
  //         `✅ Fetched ${fetchedMessages.length} messages for ${currentUsername}`
  //       );
  //       setMessages(fetchedMessages);
  //       setLastFetchTime(Date.now());

  //       if (isAtBottom) {
  //         setTimeout(() => scrollToBottom(), 100);
  //       }
  //     } else if (response.status === 404) {
  //       console.log(
  //         `📝 No messages found for ${currentUsername} (new patient)`
  //       );
  //       setMessages([]);
  //     } else {
  //       console.error(`❌ Failed to fetch messages: ${response.status}`);
  //     }
  //   } catch (error) {
  //     console.error("❌ Error fetching messages:", error);
  //   } finally {
  //     setIsLoadingMessages(false);
  //   }
  // };

  // ✅ EXISTING: Message management useEffect hooks (unchanged)
  useEffect(() => {
    if (isLoadingMessages) {
      const timeout = setTimeout(() => {
        console.warn("⚠️ Loading timeout - clearing loading state");
        setIsLoadingMessages(false);
      }, 8000);
      return () => clearTimeout(timeout);
    }
  }, [isLoadingMessages]);

  // useEffect(() => {
  //   if (currentUsername) {
  //     console.log(`👤 Patient username changed to: ${currentUsername}`);
  //     setMessages([]);
  //     setIncomingQuestions([]);
  //     setUnreadQuestions(0);
  //     setQuestionHistory([]);
  //     fetchMessages();
  //   }
  // }, [currentUsername]);

  // useEffect(() => {
  //   if (!isRecording && currentUsername) {
  //     const refreshTimeout = setTimeout(() => {
  //       console.log("🛑 Recording stopped - refreshing patient messages");
  //       fetchMessages();
  //     }, 1500);
  //     return () => clearTimeout(refreshTimeout);
  //   }
  // }, [isRecording, currentUsername]);

  // useEffect(() => {
  //   if (!currentUsername) return;
  //   const pollInterval = setInterval(() => {
  //     if (!isRecording && !isLoadingMessages) {
  //       fetchMessages();
  //     }
  //   }, 5000);
  //   return () => clearInterval(pollInterval);
  // }, [currentUsername, isRecording, isLoadingMessages]);

  // useEffect(() => {
  //   if (finalTranscription && !isRecording) {
  //     setTimeout(() => {
  //       console.log(
  //         "✅ Final transcription received - refreshing patient messages"
  //       );
  //       fetchMessages();
  //     }, 800);
  //   }
  // }, [finalTranscription, isRecording]);

  // ✅ EXISTING: Utility functions (unchanged)
  const truncateForBackend = (text) => {
    if (text.length > MAX_CHARS_FOR_BACKEND) {
      console.warn(
        `Truncating text from ${text.length} to ${MAX_CHARS_FOR_BACKEND} chars`
      );
      return text.substring(0, MAX_CHARS_FOR_BACKEND);
    }
    return text;
  };

  const getEnhancedTextStats = () => {
    const text = displayTranscription;
    const length = text.length;
    const isNearBackendLimit = length > WARNING_THRESHOLD_CHARS;
    const isOverBackendLimit = length > MAX_CHARS_FOR_BACKEND;

    return {
      length,
      maxLength: MAX_CHARS_FOR_BACKEND,
      isNearBackendLimit,
      isOverBackendLimit,
      remainingChars: MAX_CHARS_FOR_BACKEND - length,
      warningThreshold: WARNING_THRESHOLD_CHARS,
    };
  };

  useEffect(() => {
    const stats = getEnhancedTextStats();
    setNearTokenLimit(stats.isNearBackendLimit);
  }, [displayTranscription, isRecording]);

  const getTextLengthWarning = () => {
    const textStats = getEnhancedTextStats();
    if (textStats.isOverBackendLimit) {
      return `Text limit exceeded - will be truncated for AI processing`;
    } else if (textStats.isNearBackendLimit) {
      return `${textStats.remainingChars} characters remaining before truncation`;
    }
    return null;
  };

  // ✅ EXISTING: Scroll handling (unchanged)
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const atBottom = scrollHeight - scrollTop - clientHeight <= 50;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setNewMessagesCount(0);
      setLastSeenMessageIndex(messages.length - 1);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      if (isAtBottom && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
        setLastSeenMessageIndex(messages.length - 1);
        setNewMessagesCount(0);
      } else {
        const newCount = messages
          .slice(lastSeenMessageIndex + 1)
          .filter((m) => m.role === "doctor").length;
        setNewMessagesCount(newCount);
      }
    }
  }, [messages, isAtBottom, lastSeenMessageIndex]);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
      setNewMessagesCount(0);
      setLastSeenMessageIndex(messages.length - 1);
      setIsAtBottom(true);
    }
  };

  // ✅ ENHANCED: Transcription context with session support
  const enhancedTranscriptionContext = transcriptionContext
    ? {
        ...transcriptionContext,
        requestSuggestions: (ragType = "standard") => {
          if (transcriptionContext.websocket?.readyState === WebSocket.OPEN) {
            console.log(`Patient requesting suggestions (${ragType})`);
            const currentText = sessionTranscript || displayTranscription;
            const truncatedText = truncateForBackend(currentText);

            transcriptionContext.websocket.send(
              JSON.stringify({
                type: "request_suggestions",
                rag_type: ragType,
                include_partial: true,
                text: truncatedText,
                session_id: currentSessionId,
              })
            );
          } else {
            console.warn(
              "Cannot request suggestions - WebSocket not connected"
            );
          }
        },
        sendDoctorReply: (text) => {
          if (transcriptionContext.websocket?.readyState === WebSocket.OPEN) {
            console.log("Patient sending doctor reply:", text);
            const truncatedText = truncateForBackend(text);
            transcriptionContext.websocket.send(
              JSON.stringify({
                type: "doctor_reply",
                text: truncatedText,
                session_id: currentSessionId,
              })
            );
          } else {
            console.warn("Cannot send doctor reply - WebSocket not connected");
          }
        },
      }
    : null;

  return (
    <div className="patient-chat-container">
      {/* ✅ Recording indicator (only shows when patient is recording) */}
      {/* {isRecording && (
        <div
          className={`speaking-indicator-corner ${nearTokenLimit ? "warning" : ""
            }`}
        >
          <div className="recording-info">
            <div className="main-indicator">
              <div className="pulse-dot" />
              <span className="recording-text">🎤 Recording</span>
              <span className="status-display">
                Session {currentSessionId?.split("_")[1] || "Active"}
              </span>
            </div>

            <div className="text-progress">
              <div
                className={`progress-bar ${getEnhancedTextStats().isNearBackendLimit ? "warning" : ""
                  } ${getEnhancedTextStats().isOverBackendLimit ? "critical" : ""
                  }`}
                style={{
                  width: `${(sessionTranscript?.length || 0 / MAX_CHARS_FOR_BACKEND) *
                    100
                    }%`,
                }}
              />
            </div>

            {getTextLengthWarning() && (
              <div className="text-warning">{getTextLengthWarning()}</div>
            )}

            {isGenerating && (
              <div className="ai-processing">
                <div className="mini-spinner" />
                <span>AI analyzing...</span>
              </div>
            )}
          </div>
        </div>
      )} */}

      {/* ✅ CRITICAL: Live transcription ONLY when doctor is speaking */}
      {shouldShowLiveTranscription && (
        <div className="doctor-live-transcription">
          <div className="live-transcription-header">
            <div className="speaker-info">
              <span className="doctor-icon">🩺</span>
              <span className="speaker-name">Doctor Speaking</span>
              <div className="live-indicator">
                <div className="pulse-dot"></div>
                <span>LIVE</span>
              </div>
            </div>
          </div>
          <div className="live-transcription-content">
            <div className="transcription-text">
              "{contextLiveTranscription}"
              <span className="cursor-blink">|</span>
            </div>
            <div className="character-count">
              <span>{contextLiveTranscription.length} characters</span>
            </div>
          </div>
        </div>
      )}

      <header className="chat-header">
        <h3 style={{ margin: "10px" }}>Chat with Doctor</h3>
        {/* <div className="header-info">
          <span className="message-count">
            {isLoadingMessages && " (refreshing...)"}
          </span>

          {unreadQuestions > 0 && (
            <span className="question-notification">
              ❓ {unreadQuestions} new question
              {unreadQuestions !== 1 ? "s" : ""}
            </span>
          )}

          {currentSessionId && (
            <span className="session-info">
              📝 Session: {currentSessionId.split("_")[1]}
            </span>
          )}

          {suggestions.length > 0 && (
            <span className="ai-status">
              🤖 {suggestions.length} AI suggestions ready
            </span>
          )}

          <span
            className={`connection-status ${
              isConnected ? "connected" : "disconnected"
            }`}
          >
            {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
          </span>
        </div> */}
      </header>

      <section
        className="chat-messages"
        onScroll={handleScroll}
        ref={scrollContainerRef}
      >
        {/* ✅ Empty state */}
        {/* {messages.length === 0 && !isRecording && !isLoadingMessages && (
          <EmptyState mode="patient" />
        )} */}

        {/* ✅ Loading indicator */}
        {/* {isLoadingMessages && messages.length === 0 && (
          <div className="loading-messages">
            <div className="spinner" />
            <span>Loading messages for {currentUsername}...</span>
          </div>
        )} */}

        {/* ✅ Regular messages (no analysis badges for patient) */}
        {/* {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.message_id || `${msg.timestamp}-${idx}` || idx}
            message={msg}
            isOwn={msg.role === "user"}
            mode={ROLES.PATIENT}
            showAnalysis={false} // ✅ CRITICAL: No analysis badges for patient
          />
        ))} */}

        {/* ✅ NEW: Incoming questions display */}
        {incomingQuestions.map((question) => (
          <div
            key={question.id}
            className={`incoming-question ${
              question.isRead ? "read" : "unread"
            } d-none`}
          >
            <div className="question-header">
              <span className="question-icon">❓</span>
              <span className="question-label">Question from Doctor</span>
              <span className="question-timestamp">
                {new Date(question.timestamp).toLocaleTimeString()}
              </span>
              {!question.isRead && <div className="unread-indicator"></div>}
            </div>
            {/* <div className="question-content">{question.text}</div> */}
            {question.sessionId && (
              <div className="question-context">
                <small>From session: {question.sessionId.split("_")[1]}</small>
              </div>
            )}
          </div>
        ))}

        {/* ✅ REMOVED: No live transcription overlay for patient self-recording */}
        {/* Patient should never see their own transcription */}

        {/* ✅ AI Processing indicator */}
        {isGenerating && !isRecording && (
          <div className="ai-processing-overlay">
            <div className="processing-bubble">
              <div className="processing-header">
                <div className="ai-spinner" />
                <span>🤖 Doctor is receiving AI suggestions...</span>
              </div>
              <p>
                Your speech is being analyzed to help the doctor provide better
                responses
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ✅ Warning banners */}
      {getEnhancedTextStats().isOverBackendLimit && !isRecording && (
        <div className="token-warning-banner critical">
          <span className="warning-icon">🚫</span>
          <span>
            Previous session exceeded the {MAX_CHARS_FOR_BACKEND} character
            limit and was truncated.
          </span>
        </div>
      )}

      {/* ✅ Enhanced scroll notification */}
      {!isAtBottom && (newMessagesCount > 0 || unreadQuestions > 0) && (
        <button className="scroll-to-bottom enhanced" onClick={scrollToBottom}>
          <div className="notification-content">
            <span className="arrow-icon">⬇️</span>
            <div className="notification-text">
              {newMessagesCount > 0 && (
                <>
                  <span className="count">{newMessagesCount}</span>
                  <span>
                    New Message{newMessagesCount > 1 ? "s" : ""} from Doctor
                  </span>
                </>
              )}
              {unreadQuestions > 0 && (
                <div className="question-count">
                  ❓ {unreadQuestions} New Question
                  {unreadQuestions > 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        </button>
      )}

      {/* ✅ Connection status banner */}
      {!isConnected && (
        <div className="connection-banner">
          <span className="warning-icon">⚠️</span>
          <span>Connection lost. Reconnecting to real-time stream...</span>
        </div>
      )}
      <div
        style={{
          width: "100hw",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Footer
          mode={ROLES.PATIENT}
          isListening={isRecording}
          toggleSpeechRecognition={toggleRecording}
          currentUsername={currentUsername}
          transcriptionContext={enhancedTranscriptionContext}
          contextData={{
            finalTranscription,
            sessionTranscript,
            currentSessionId,
            isGenerating,
            suggestionsCount: suggestions.length,
            nearTokenLimit,
            textStats: getEnhancedTextStats(),
            questionsCount: incomingQuestions.length,
            unreadQuestions: unreadQuestions,
          }}
        />
      </div>
    </div>
  );
}
