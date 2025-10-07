// hooks/useTranscriptionHandlers.js
import { useEffect, useCallback, useRef } from "react";
import { appendPatientMessage, sendDoctorReply } from "../api";
import { ROLES } from "../constants";

export function useTranscriptionHandlers({
  currentUsername,
  mode,
  setMessages,
}) {
  const lastBroadcastRef = useRef("");
  const broadcastIntervalRef = useRef(null);
  const savingRef = useRef(false);

  // 🔧 ENHANCED: More frequent real-time broadcasting with optimized throttling
  const handleBroadcastTranscription = useCallback(
    (liveTranscription, isTranscribing, transcriptionContext) => {
      console.log("🔍 Broadcast check:", {
        liveTranscription: liveTranscription?.substring(0, 30),
        isTranscribing,
        hasContext: !!transcriptionContext,
        isConnected: transcriptionContext?.isConnected,
      });

      if (!transcriptionContext) {
        console.warn("⚠️ No transcription context provided");
        return;
      }

      if (isTranscribing && liveTranscription && liveTranscription.trim()) {
        const speakerMode = mode === ROLES.PATIENT ? "patient" : "doctor";
        const trimmedTranscription = liveTranscription.trim();

        // Force broadcast every time for debugging
        if (
          transcriptionContext.broadcastLiveTranscription &&
          transcriptionContext.isConnected
        ) {
          transcriptionContext.broadcastLiveTranscription(
            trimmedTranscription,
            speakerMode
          );
          console.log(
            "📡 FORCE Broadcasting:",
            speakerMode,
            trimmedTranscription.substring(0, 30)
          );
        } else {
          console.error("❌ Cannot broadcast:", {
            hasFunction: !!transcriptionContext.broadcastLiveTranscription,
            isConnected: transcriptionContext.isConnected,
          });
        }
      }
    },
    [mode]
  );

  // Enhanced final transcript save with better error handling and UI feedback
  const handleFinalTranscriptSave = useCallback(
    async (finalTranscriptText, speakerRole, transcriptionContext = null) => {
      if (!finalTranscriptText || !currentUsername || savingRef.current) {
        console.log("⚠️ Skipping save - missing data or already saving");
        return;
      }

      const trimmedText = finalTranscriptText.trim();
      if (trimmedText.length < 3) {
        console.log("⚠️ Transcript too short, skipping save");
        return;
      }

      savingRef.current = true;

      console.log(
        `💾 Saving final ${speakerRole} transcript (${trimmedText.length} chars):`,
        trimmedText.substring(0, 50) + "..."
      );

      // Stop broadcasting immediately
      if (transcriptionContext?.stopTranscriptionBroadcast) {
        transcriptionContext.stopTranscriptionBroadcast();
      }

      // Clear any pending broadcasts
      if (broadcastIntervalRef.current) {
        clearTimeout(broadcastIntervalRef.current);
        broadcastIntervalRef.current = null;
      }
      lastBroadcastRef.current = "";

      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const message = {
        role: speakerRole,
        content: trimmedText,
        timestamp: new Date().toISOString(),
        display_time: timestamp,
        message_id: `transcript_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        isTranscript: true, // Flag to identify transcript messages
      };

      // Add message to local state immediately for instant UI feedback
      setMessages((prev) => [...prev, message]);

      try {
        let saveResult;

        if (speakerRole === "user") {
          // Patient message - Save only, no auto-generation
          saveResult = await appendPatientMessage(currentUsername, trimmedText);
          console.log(
            "✅ Patient transcript saved successfully (no auto-generation)"
          );
        } else if (speakerRole === "doctor") {
          // Doctor message
          saveResult = await sendDoctorReply(currentUsername, trimmedText);
          console.log("✅ Doctor transcript saved successfully");
        } else {
          throw new Error(`Unknown speaker role: ${speakerRole}`);
        }

        // Update the message with server response if available
        if (saveResult?.data?.message_id) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.message_id === message.message_id
                ? {
                    ...msg,
                    message_id: saveResult.data.message_id,
                    serverSaved: true,
                  }
                : msg
            )
          );
        }
      } catch (error) {
        console.error("❌ Failed to save transcript:", error);

        // Remove message from local state if save failed
        setMessages((prev) =>
          prev.filter((m) => m.message_id !== message.message_id)
        );

        // Show user-friendly error message
        const errorMessage =
          error.response?.data?.message || error.message || "Unknown error";
        alert(`Failed to save message: ${errorMessage}. Please try again.`);

        // Optionally retry after a delay
        setTimeout(() => {
          console.log("🔄 Retrying transcript save...");
          savingRef.current = false;
          handleFinalTranscriptSave(
            trimmedText,
            speakerRole,
            transcriptionContext
          );
        }, 2000);

        return;
      } finally {
        savingRef.current = false;
      }
    },
    [currentUsername, setMessages]
  );

  // Enhanced speech recognition toggle with better callback handling
  const handleToggleSpeechRecognition = useCallback(
    (toggleSpeechRecognition, transcriptionContext) => {
      console.log(`🎤 Toggling speech recognition for ${mode}`);

      toggleSpeechRecognition((transcript) => {
        if (transcript && transcript.trim() && transcript.trim().length > 2) {
          const speakerRole = mode === ROLES.PATIENT ? "user" : "doctor";
          console.log(
            `📝 Speech recognition completed for ${speakerRole}:`,
            transcript.substring(0, 50)
          );

          handleFinalTranscriptSave(
            transcript.trim(),
            speakerRole,
            transcriptionContext
          );
        } else {
          console.log(
            "⚠️ Speech recognition completed but transcript is too short or empty"
          );
        }
      });
    },
    [mode, handleFinalTranscriptSave]
  );

  // Enhanced auto-save effect with better dependency management
  const useAutoSaveFinalTranscript = useCallback(
    (finalTranscript) => {
      useEffect(() => {
        if (
          finalTranscript &&
          finalTranscript.trim() &&
          finalTranscript.trim().length > 2
        ) {
          const speakerRole = mode === ROLES.PATIENT ? "user" : "doctor";
          console.log(`🔄 Auto-saving final transcript for ${speakerRole}`);

          // Add small delay to ensure transcription has fully stopped
          const saveTimer = setTimeout(() => {
            handleFinalTranscriptSave(finalTranscript.trim(), speakerRole);
          }, 500);

          return () => clearTimeout(saveTimer);
        }
      }, [finalTranscript]);
    },
    [handleFinalTranscriptSave, mode]
  );

  // Cleanup function for component unmount
  useEffect(() => {
    return () => {
      // Clear any pending broadcasts
      if (broadcastIntervalRef.current) {
        clearTimeout(broadcastIntervalRef.current);
        broadcastIntervalRef.current = null;
      }
      lastBroadcastRef.current = "";
      savingRef.current = false;
    };
  }, []);

  // Force save function for manual transcript saving
  const forceSaveTranscript = useCallback(
    async (text, transcriptionContext = null) => {
      if (!text || !currentUsername) {
        console.warn("⚠️ Cannot force save - missing text or username");
        return false;
      }

      const speakerRole = mode === ROLES.PATIENT ? "user" : "doctor";
      console.log(`🚀 Force saving transcript for ${speakerRole}`);

      try {
        await handleFinalTranscriptSave(
          text,
          speakerRole,
          transcriptionContext
        );
        return true;
      } catch (error) {
        console.error("❌ Force save failed:", error);
        return false;
      }
    },
    [currentUsername, mode, handleFinalTranscriptSave]
  );

  // Check if currently saving
  const isSaving = useCallback(() => savingRef.current, []);

  // 🔧 NEW: Force broadcast function for immediate broadcasting
  const forceBroadcast = useCallback(
    (transcript, transcriptionContext) => {
      if (!transcript || !transcriptionContext) return;

      const speakerMode = mode === ROLES.PATIENT ? "patient" : "doctor";

      if (
        transcriptionContext.broadcastLiveTranscription &&
        transcriptionContext.isConnected
      ) {
        transcriptionContext.broadcastLiveTranscription(
          transcript,
          speakerMode
        );
        console.log(
          `🚀 Force broadcasting ${speakerMode} transcription:`,
          transcript.substring(0, 30) + "..."
        );
      }
    },
    [mode]
  );

  return {
    handleBroadcastTranscription,
    handleFinalTranscriptSave,
    handleToggleSpeechRecognition,
    useAutoSaveFinalTranscript,
    forceSaveTranscript,
    forceBroadcast,
    isSaving,
  };
}
