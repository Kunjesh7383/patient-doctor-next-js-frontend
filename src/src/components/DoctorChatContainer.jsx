import React, { useState, useRef, useEffect, useCallback } from "react";
import { ROLES } from "../constants";
import { useTranscription } from "../contexts/TranscriptionContext";

import { useDoctorWebSocket } from "../hooks/doctor/useDoctorWebSocket";
import { useQuestionGeneration } from "../hooks/doctor/useQuestionGeneration";
import { useAnalysisTracking } from "../hooks/doctor/useAnalysisTracking";
import { useErrorManagement } from "../hooks/doctor/useErrorManagement";

import { ErrorNotificationManager } from "./doctor/ErrorNotificationManager";
import { DoctorTimeline } from "./doctor/DoctorTimeline";
import { DoctorFooter } from "./doctor/DoctorFooter";
import { DoctorHeader } from "./doctor/DoctorHeader";

import LiveTranscriptionDisplay from "./LiveTranscriptionDisplay";
import MessageBubble from "./MessageBubble";
import PatientAnalysisDisplay from "./PatientAnalysisDisplay";

import EventItem from "./doctor/EventItem";
import SuggestedQuestions from "./doctor/SuggestedQuestions";
import DoctorMessageInput from "./doctor/DoctorMessageInput";

import "../styles/DoctorChatContainer.css";

const truncateText = (text, maxLength = 2000) => {
  if (!text || text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(" ");
  if (lastSpaceIndex > maxLength * 0.7) {
    return truncated.substring(0, lastSpaceIndex) + "...";
  }
  return truncated + "...";
};

const hasExistingQuestions = (message) => {
  return message.generated_questions && message.generated_questions.length > 0;
};

export default function DoctorChatContainer({
  messages: initialMessages = [],
  currentUsername,
  transcriptionContext,
  onSendSuggestion,
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [events, setEvents] = useState([]);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const { errors, addError, dismissError } = useErrorManagement();
  const { currentAnalysis, updateAnalysis, getAnalysisForMessage } =
    useAnalysisTracking(messages);

  const {
    isConnected,
    liveTranscription,
    currentSpeaker,
    currentSessionId,
    sendQuestion,
    doctorWebSocket,
  } = useDoctorWebSocket(currentUsername, {
    onMessagesUpdate: setMessages,
    onEventsUpdate: setEvents,
    onAnalysisUpdate: updateAnalysis,
    onErrorAdd: addError,
    messages,
  });

  const {
    isGeneratingQuestions,
    generateSuggestions,
    canGenerateQuestions,
    getGenerateButtonText,
  } = useQuestionGeneration(currentUsername, {
    liveTranscription,
    currentSessionId,
    currentAnalysis,
    messages,
    onMessagesUpdate: setMessages,
    onEventsUpdate: setEvents,
    onAnalysisUpdate: updateAnalysis,
    onErrorAdd: addError,
    onHighlightMessage: setHighlightedMessageId,
  });

  const createUnifiedTimeline = useCallback(() => {
    const timeline = [];

    messages.forEach((message, msgIndex) => {
      if (!message.message_id) {
        message.message_id = `msg-${message.timestamp}-${msgIndex}`;
      }

      const messageAnalysis = getAnalysisForMessage(message.message_id);
      const messageEvents = events.filter(
        (event) => event.messageId === message.message_id
      );

      timeline.push({
        type: "message",
        data: message,
        index: msgIndex,
        analysis: messageAnalysis,
        events: messageEvents,
      });
    });

    return timeline;
  }, [messages, events, getAnalysisForMessage]);

  const timeline = createUnifiedTimeline();

  const handleSendDoctorMessage = useCallback(
    async (messageText) => {
      console.log("Sending doctor message:", messageText);

      if (!messageText.trim() || isSendingMessage) {
        console.log("Message empty or already sending, skipping");
        return;
      }

      setIsSendingMessage(true);

      try {
        // ✅ CRITICAL: Check WebSocket connection
        if (!doctorWebSocket || doctorWebSocket.readyState !== WebSocket.OPEN) {
          throw new Error("WebSocket not connected");
        }

        // ✅ CRITICAL: Create message payload (exact same format as original)
        const messagePayload = {
          type: "doctormessage", // Different from 'doctor_question'
          message: messageText,
          timestamp: new Date().toISOString(),
          patientid: currentUsername,
          sessionid: currentSessionId,
        };

        // ✅ CRITICAL: Send via WebSocket
        doctorWebSocket.send(JSON.stringify(messagePayload));
        console.log(
          "Doctor message sent via WebSocket, waiting for confirmation..."
        );

        // ✅ Success notification (same as original)
        addError({
          type: "info",
          title: "Message Sent",
          message: "Your message has been sent to the patient.",
        });
      } catch (error) {
        console.error("Failed to send doctor message:", error);

        addError({
          type: "error",
          title: "Failed to Send Message",
          message: "Could not send message. Please try again.",
        });
      } finally {
        setIsSendingMessage(false);
      }
    },
    [
      isSendingMessage,
      addError,
      doctorWebSocket,
      currentUsername,
      currentSessionId,
    ]
  );
  // Debug logging for live transcription
  console.log("Debug LiveTranscription Values:", {
    liveTranscription: liveTranscription?.substring(0, 50) + "...",
    liveTranscriptionLength: liveTranscription?.length,
    currentSpeaker,
    isConnected,
    currentSessionId,
    shouldShow:
      liveTranscription &&
      liveTranscription.length > 0 &&
      currentSpeaker === "patient",
    hasLiveTranscription: !!liveTranscription,
    hasLength: liveTranscription?.length > 0,
    speakerIsPatient: currentSpeaker === "patient",
  });

  return (
    <div className="doctor-container">
      <ErrorNotificationManager errors={errors} onDismissError={dismissError} />

      <DoctorHeader
        currentUsername={currentUsername}
        currentAnalysis={currentAnalysis}
        PatientAnalysisDisplay={PatientAnalysisDisplay}
      />

      {console.log("Rendering LiveTranscription check:", {
        condition1: !!liveTranscription,
        condition2: liveTranscription?.length > 0,
        condition3: currentSpeaker === "patient",
        finalCondition:
          liveTranscription &&
          liveTranscription.length > 0 &&
          currentSpeaker === "patient",
      })}

      <LiveTranscriptionDisplay
        mode={ROLES.DOCTOR}
        liveTranscription={liveTranscription}
        currentSpeaker={currentSpeaker}
        currentAnalysis={currentAnalysis}
        onManualTrigger={() => generateSuggestions()}
        isConnected={isConnected}
        sessionId={currentSessionId}
      />

      <DoctorTimeline
        timeline={timeline}
        onSendQuestion={sendQuestion}
        onGenerateSuggestions={generateSuggestions}
        isGeneratingQuestions={isGeneratingQuestions}
        highlightedMessageId={highlightedMessageId}
        MessageItem={MessageBubble}
        EventItem={EventItem}
        hasExistingQuestions={hasExistingQuestions}
      />

      <DoctorFooter
        isConnected={isConnected}
        messages={messages}
        events={events}
        currentSessionId={currentSessionId}
        liveTranscription={liveTranscription}
        errors={errors}
        onSendMessage={handleSendDoctorMessage}
        isSending={isSendingMessage}
        onGenerateSuggestions={generateSuggestions}
        canGenerateQuestions={canGenerateQuestions}
        getGenerateButtonText={getGenerateButtonText}
        isGeneratingQuestions={isGeneratingQuestions}
        DoctorMessageInput={DoctorMessageInput}
      />
    </div>
  );
}
