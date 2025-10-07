import React, { useState, useCallback, useEffect } from "react";
import { ROLES, RAG_TYPES } from "./constants";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Sidebar from "./components/Sidebar.jsx";
import PatientChatContainer from "./components/PatientChatContainer.jsx";
import DoctorChatContainer from "./components/DoctorChatContainer.jsx";
import RagTypeSelector from "./components/RagTypeSelector.jsx";
import SummaryBanner from "./components/SummaryBanner.jsx";
import RealTimeTranscriptionManager from "./components/RealTimeTranscriptionManager.jsx";
import { TranscriptionProvider } from "./contexts/TranscriptionContext";
import { usePatientManagement } from "./hooks/usePatientManagement";
import { useChatManagement } from "./hooks/useChatManagement";
import { useSuggestionManagement } from "./hooks/useSuggestionManagement";
import {
  appStyles,
  headerStyles,
  menuButtonStyles,
  titleStyles,
  connectionIndicatorStyles,
  statusDotStyles,
  statusTextStyles,
  welcomeScreenStyles,
  welcomeCardStyles,
  mainContentStyles,
  contentWrapperStyles,
  footerStyles,
  theme,
} from "./appStyles";
import "./App.css";

function MainContent({
  transcriptionContext,
  mode,
  setMode,
  wsConnectionStatus,
  hasConnected,
  isRecording,
  setIsRecording,
  currentUsername,
  patients,
  isLoadingPatients,
  suggestionHook,
  messages,
  setMessages,
  ragType,
  router,
  username,
  setUsername,
  isSidebarOpen,
  setIsSidebarOpen,
  isRoleMenuOpen,
  setIsRoleMenuOpen,
}) {
  // Auto-connect when username changes
  useEffect(() => {
    if (
      currentUsername &&
      transcriptionContext &&
      !hasConnected &&
      wsConnectionStatus !== "connected"
    ) {
      transcriptionContext.reconnect();
    }
  }, [currentUsername, transcriptionContext, hasConnected, wsConnectionStatus]);

  const handleRecordingToggle = useCallback(() => {
    if (!transcriptionContext?.isConnected) {
      alert("WebSocket connection not ready. Please wait and try again.");
      return;
    }
    if (isRecording || transcriptionContext.isRecording) {
      transcriptionContext?.stopVoskTranscription();
      setIsRecording(false);
    } else {
      transcriptionContext
        ?.startVoskTranscription()
        .then((success) => {
          if (success !== false) setIsRecording(true);
        })
        .catch(() => setIsRecording(false));
    }
  }, [isRecording, transcriptionContext, setIsRecording]);

  // Sync recording state from transcription context
  useEffect(() => {
    if (transcriptionContext?.isRecording !== undefined) {
      setIsRecording(transcriptionContext.isRecording);
    }
  }, [transcriptionContext?.isRecording, setIsRecording]);

  // Message creation from WebSocket
  useEffect(() => {
    if (transcriptionContext?.websocket) {
      const originalOnMessage = transcriptionContext.websocket.onmessage;
      transcriptionContext.websocket.onmessage = (event) => {
        if (originalOnMessage) originalOnMessage(event);
        try {
          const data = JSON.parse(event.data);
          if (data.type === "final" && data.text?.trim()) {
            const newMessage = {
              message_id: `transcript_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`,
              role: "user",
              content: data.text.trim(),
              timestamp: new Date().toISOString(),
              sender: "patient",
            };
            setMessages((prev) => {
              const isDuplicate = prev.some(
                (msg) =>
                  msg.content === data.text.trim() &&
                  msg.role === "user" &&
                  Math.abs(new Date(msg.timestamp).getTime() - Date.now()) < 5000
              );
              if (!isDuplicate) return [...prev, newMessage];
              return prev;
            });
          }
        } catch {}
      };
    }
  }, [transcriptionContext?.websocket, setMessages]);

  const handleSelectPatient = useCallback(
    (patientId) => {
      setUsername(patientId);
      setIsSidebarOpen(false);
      suggestionHook.clearSuggestions();
      setIsRecording(false);
      const target = mode === ROLES.DOCTOR ? "/doctor" : "/patient";
      try {
        router.push(`${target}?username=${encodeURIComponent(patientId)}`);
      } catch {}
    },
    [suggestionHook, mode, router, setIsRecording, setIsSidebarOpen, setUsername]
  );

  const handleUsernameSubmit = useCallback(
    (newUsername) => {
      setUsername(newUsername);
      setIsSidebarOpen(false);
      suggestionHook.clearSuggestions();
      setIsRecording(false);
      const target = mode === ROLES.DOCTOR ? "/doctor" : "/patient";
      try {
        router.push(`${target}?username=${encodeURIComponent(newUsername)}`);
      } catch {}
    },
    [suggestionHook, mode, router, setIsRecording, setIsSidebarOpen, setUsername]
  );

  return (
    <>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        username={username}
        setUsername={setUsername}
        onUsernameSubmit={handleUsernameSubmit}
        patients={patients}
        activePatientId={currentUsername}
        onSelectPatient={handleSelectPatient}
        isLoadingPatients={isLoadingPatients}
      />

      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      <header style={headerStyles}>
        <button
          style={menuButtonStyles}
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open sidebar"
        >
          ☰
        </button>

        <h1 style={titleStyles}>
          {mode === ROLES.PATIENT ? "Mental Health Assistant" : "Doctor Assistant"}
          {currentUsername && <span className="username-display">- {currentUsername}</span>}
        </h1>

        <div style={{ position: "relative" }}>
          <button
            className="btn btn-outline-secondary dropdown-toggle"
            onClick={() => setIsRoleMenuOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={isRoleMenuOpen}
          >
            {mode === ROLES.PATIENT ? "Patient" : "Doctor"}
          </button>
          {isRoleMenuOpen && (
            <div className="dropdown-menu dropdown-menu-end show" style={{ right: 0, left: "auto" }}>
              <button
                className="dropdown-item"
                onClick={() => {
                  setMode(ROLES.PATIENT);
                  setIsRecording(false);
                  setIsSidebarOpen(true);
                  setIsRoleMenuOpen(false);
                  try { router.push("/patient"); } catch {}
                }}
              >
                Patient
              </button>
              <button
                className="dropdown-item"
                onClick={() => {
                  setMode(ROLES.DOCTOR);
                  setIsRecording(false);
                  setIsSidebarOpen(true);
                  setIsRoleMenuOpen(false);
                  try { router.push("/doctor"); } catch {}
                }}
              >
                Doctor
              </button>
            </div>
          )}
        </div>

        {currentUsername && (
          <div style={connectionIndicatorStyles}>
            <div style={statusDotStyles(wsConnectionStatus)} />
            <span style={statusTextStyles}>
              {wsConnectionStatus === "connected"
                ? "Connected"
                : wsConnectionStatus === "connecting"
                ? "Connecting..."
                : wsConnectionStatus === "loading"
                ? "Loading..."
                : "Connection Error"}
            </span>
          </div>
        )}
      </header>

      {!currentUsername ? (
        <div style={welcomeScreenStyles}>
          <div style={welcomeCardStyles}>
            <h2 className="welcome-title">Welcome to Healthcare Platform</h2>
            <p className="welcome-description">Advanced technology platform for seamless communication and real-time interaction.</p>
            <button onClick={() => setIsSidebarOpen(true)} className="get-started-btn">Get Started</button>
          </div>
        </div>
      ) : (
        <div style={mainContentStyles}>
          <div style={contentWrapperStyles}>
            <main className="main-content">
              {mode === ROLES.PATIENT ? (
                <PatientChatContainer
                  messages={messages}
                  isRecording={isRecording}
                  toggleRecording={handleRecordingToggle}
                  currentUsername={currentUsername}
                  transcriptionContext={transcriptionContext}
                />
              ) : (
                <DoctorChatContainer
                  messages={messages}
                  isRecording={isRecording}
                  toggleRecording={handleRecordingToggle}
                  currentSuggestions={suggestionHook.pendingSuggestions || []}
                  historicalSuggestions={suggestionHook.historicalSuggestions || []}
                  sentQuestions={suggestionHook.sentQuestions || []}
                  highlightedTextMap={suggestionHook.highlightedTextMap || {}}
                  connectedMessageId={suggestionHook.connectedMessageId}
                  isPatientSpeaking={isRecording}
                  currentUsername={currentUsername}
                  onSuggestionClick={(suggestion, messageId) => {
                    suggestionHook.setSelectedQuestion(suggestion);
                    if (suggestionHook.setConnectedMessageId) {
                      suggestionHook.setConnectedMessageId(messageId);
                    }
                    if (suggestionHook.setHighlightedTextMap && messageId) {
                      suggestionHook.setHighlightedTextMap({
                        ...suggestionHook.highlightedTextMap,
                        [messageId]: suggestion.contextText || "",
                      });
                    }
                  }}
                  onSendSuggestion={(suggestion) => {
                    if (transcriptionContext?.sendDoctorReply) {
                      transcriptionContext.sendDoctorReply(suggestion);
                    }
                    suggestionHook.sendSuggestion(suggestion);
                  }}
                  ragContext={suggestionHook.ragContext}
                  qaContext={suggestionHook.qaContext}
                  onGenerateSuggestions={() => {
                    if (transcriptionContext?.requestSuggestions) {
                      transcriptionContext.requestSuggestions(ragType);
                    }
                  }}
                  liveTranscriptionActive={isRecording}
                  transcriptionContext={transcriptionContext}
                />
              )}
            </main>
          </div>
        </div>
      )}

      <div style={footerStyles}>© {new Date().getFullYear()} All rights reserved.</div>
    </>
  );
}

export default function App() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mode, setMode] = useState(ROLES.PATIENT);
  const [ragType, setRagType] = useState(RAG_TYPES[1]);
  const [wsConnectionStatus, setWsConnectionStatus] = useState("disconnected");
  const [isRecording, setIsRecording] = useState(false);
  const [hasConnected, setHasConnected] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Custom hooks
  const { patients, isLoadingPatients, currentUsername, setCurrentUsername } =
    usePatientManagement();

  // Sync mode from path and username from query
  useEffect(() => {
    if (pathname?.startsWith("/doctor")) {
      setMode(ROLES.DOCTOR);
    } else if (pathname?.startsWith("/patient")) {
      setMode(ROLES.PATIENT);
    }

    const qpUser = searchParams?.get("username") || searchParams?.get("patient_id");
    if (qpUser && qpUser !== currentUsername) {
      setCurrentUsername(qpUser);
    }
  }, [pathname, searchParams, currentUsername, setCurrentUsername]);

  // const { messages, setMessages, summary, connectionStatus, loadChatHistory } =
  //   useChatManagement(currentUsername);
  const { messages, setMessages, summary, connectionStatus } =
    useChatManagement(currentUsername);
  // Remove loadChatHistory - no longer needed with WebSocket

  const suggestionHook = useSuggestionManagement(
    mode,
    currentUsername,
    ragType,
    messages
    // loadChatHistory
  );

  const handleConnectionStatusChange = useCallback((status) => {
    console.log("🔄 WebSocket Connection Status:", status);
    setWsConnectionStatus(status);

    if (status === "connected") {
      setHasConnected(true);
    } else if (status === "disconnected") {
      setHasConnected(false);
      setIsRecording(false);
    }
  }, []);

  const handleSelectPatient = useCallback(
    (patientId) => {
      console.log("👤 Selecting patient:", patientId);
      setCurrentUsername(patientId);
      setIsSidebarOpen(false);
      suggestionHook.clearSuggestions();
      setIsRecording(false);
      setHasConnected(false);

      // Navigate to the correct route with patient id
      const target = mode === ROLES.DOCTOR ? "/doctor" : "/patient";
      const url = `${target}?username=${encodeURIComponent(patientId)}`;
      try {
        router.push(url);
      } catch {}
    },
    [suggestionHook, mode, router, setCurrentUsername]
  );

  const handleUsernameSubmit = useCallback(
    (newUsername) => {
      console.log("📝 Submitting username:", newUsername);
      setCurrentUsername(newUsername);
      setIsSidebarOpen(false);
      suggestionHook.clearSuggestions();
      setIsRecording(false);
      setHasConnected(false);

      const target = mode === ROLES.DOCTOR ? "/doctor" : "/patient";
      const url = `${target}?username=${encodeURIComponent(newUsername)}`;
      try {
        router.push(url);
      } catch {}
    },
    [suggestionHook, mode, router, setCurrentUsername]
  );

  return (
    isMounted && (
    <div style={appStyles}>
      <TranscriptionProvider>
        <RealTimeTranscriptionManager
          currentUsername={currentUsername}
          mode={mode}
          onConnectionStatusChange={handleConnectionStatusChange}
        >
          {(transcriptionContext) => (
            <MainContent
              transcriptionContext={transcriptionContext}
              mode={mode}
              setMode={setMode}
              wsConnectionStatus={wsConnectionStatus}
              hasConnected={hasConnected}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
              currentUsername={currentUsername}
              patients={patients}
              isLoadingPatients={isLoadingPatients}
              suggestionHook={suggestionHook}
              messages={messages}
              setMessages={setMessages}
              ragType={ragType}
              router={router}
              username={currentUsername}
              setUsername={setCurrentUsername}
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
              isRoleMenuOpen={isRoleMenuOpen}
              setIsRoleMenuOpen={setIsRoleMenuOpen}
            />
          )}
        </RealTimeTranscriptionManager>
      </TranscriptionProvider>
    </div>
    )
  );
}
