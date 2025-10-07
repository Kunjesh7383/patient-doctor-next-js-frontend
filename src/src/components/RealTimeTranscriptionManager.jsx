// components/RealTimeTranscriptionManager.jsx
import React, { useRef, useCallback, useState, useEffect } from "react";
import { API_URL } from "../api";
import { useTranscription } from "../contexts/TranscriptionContext";

export default function RealTimeTranscriptionManager({
  currentUsername,
  mode,
  onConnectionStatusChange,
  children,
}) {
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioStreamRef = useRef(null);
  const isRecordingRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const { updateTranscription, clearTranscription } = useTranscription();

  // ✅ FIXED: WebSocket connection matching your backend's exact expectations
  const connectWebSocket = useCallback(() => {
    if (!currentUsername) return;

    const wsUrl = API_URL.replace(/^http/, "ws");
    const endpoint = `${wsUrl}/ws/recognize/${currentUsername}`;

    console.log(`🔌 Connecting to Vosk backend: ${endpoint}`);

    wsRef.current = new WebSocket(endpoint);
    wsRef.current.binaryType = "arraybuffer"; // ✅ CRITICAL: Match backend expectation

    wsRef.current.onopen = () => {
      console.log("✅ WebSocket connected to Vosk backend");
      setIsConnected(true);
      onConnectionStatusChange?.("connected");
    };

    // ✅ HANDLE MESSAGES: Process backend responses
    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📨 Backend message:", data);

        switch (data.type) {
          case "partial":
            if (data.text) {
              console.log("🎤 Partial:", data.text);
              updateTranscription(data.text, "patient");
            }
            break;

          case "final":
            if (data.text) {
              console.log("✅ Final:", data.text);
              updateTranscription(data.text, "patient");

              // Clear after 3 seconds
              setTimeout(() => {
                updateTranscription("", "patient");
              }, 3000);
            }
            break;

          case "suggestion":
            console.log("🤖 AI suggestions received:", data.items?.length || 0);
            break;

          case "pong":
            console.log("💓 Pong received - connection healthy");
            break;

          case "control":
            console.log("🎛️ Control acknowledgment:", data.control_type);
            break;

          default:
            console.log("📦 Unknown message:", data.type);
        }
      } catch (err) {
        // Not JSON - binary acknowledgment or other data
        console.log("📡 Binary acknowledgment from backend");
      }
    };

    wsRef.current.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      setIsConnected(false);
      onConnectionStatusChange?.("error");
    };

    wsRef.current.onclose = (event) => {
      console.log("🔌 WebSocket closed:", event.code, event.reason);
      setIsConnected(false);
      setIsRecording(false);
      isRecordingRef.current = false;
      onConnectionStatusChange?.("disconnected");

      if (clearTranscription) {
        clearTranscription();
      }
    };
  }, [
    currentUsername,
    onConnectionStatusChange,
    updateTranscription,
    clearTranscription,
  ]);

  // ✅ AUDIO CAPTURE: Send exactly what your Vosk backend expects
  const initializeAudio = useCallback(async () => {
    try {
      console.log("🎤 Initializing audio for Vosk backend");

      // Request microphone - 16kHz mono as Vosk expects
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioStreamRef.current = stream;
      const audioContext = new AudioContext({ sampleRate: 16000 });

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // Use ScriptProcessor for reliable PCM16 generation
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      let chunkCount = 0;

      processor.onaudioprocess = (event) => {
        // Only send when recording and connected
        if (
          !isRecordingRef.current ||
          !wsRef.current ||
          wsRef.current.readyState !== WebSocket.OPEN
        ) {
          return;
        }

        const inputData = event.inputBuffer.getChannelData(0);

        // ✅ CONVERT: Float32 to PCM16 exactly as your backend processes
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          let sample = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        // ✅ CRITICAL: Send binary data directly (not in JSON wrapper)
        try {
          wsRef.current.send(pcmData.buffer);
          chunkCount++;

          // Log occasionally to track progress
          if (chunkCount % 100 === 0) {
            console.log(`📡 Sent ${chunkCount} audio chunks to Vosk`);
          }
        } catch (error) {
          console.error("❌ Failed to send audio chunk:", error);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      audioContextRef.current = { audioContext, processor, source, stream };

      console.log("✅ Audio pipeline ready for Vosk backend");
      return true;
    } catch (error) {
      console.error("❌ Audio initialization failed:", error);

      if (error.name === "NotAllowedError") {
        alert("Microphone permission denied. Please allow microphone access.");
      } else {
        alert(`Audio setup failed: ${error.message}`);
      }
      return false;
    }
  }, []);

  // ✅ START RECORDING: Ensure connection then stream audio
  const startRecording = useCallback(async () => {
    console.log("🎤 Starting recording for Vosk backend");

    // Ensure WebSocket connection
    if (!isConnected) {
      console.log("🔄 Not connected, connecting first...");
      connectWebSocket();

      // Wait for connection
      await new Promise((resolve) => {
        const checkConnection = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            clearInterval(checkConnection);
            resolve(true);
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkConnection);
          resolve(false);
        }, 10000);
      });
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error("❌ Could not establish WebSocket connection");
      return false;
    }

    // Clear any previous transcription
    if (clearTranscription) {
      clearTranscription();
    }

    // Initialize audio capture
    const audioReady = await initializeAudio();
    if (!audioReady) {
      console.error("❌ Audio initialization failed");
      return false;
    }

    // Start recording
    setIsRecording(true);
    isRecordingRef.current = true;

    console.log("✅ Recording started - streaming to Vosk backend");
    return true;
  }, [isConnected, connectWebSocket, initializeAudio, clearTranscription]);

  // ✅ STOP RECORDING: Clean shutdown
  const stopRecording = useCallback(() => {
    console.log("🛑 Stopping recording");

    setIsRecording(false);
    isRecordingRef.current = false;

    // Clean up audio resources
    if (audioContextRef.current) {
      const { processor, audioContext, source, stream } =
        audioContextRef.current;

      if (processor) processor.disconnect();
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close();
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      audioContextRef.current = null;
    }

    if (clearTranscription) {
      clearTranscription();
    }

    console.log("✅ Recording stopped and cleaned up");
  }, [clearTranscription]);

  // ✅ TRANSCRIPTION CONTEXT: Provide interface matching your needs
  const transcriptionContext = {
    isConnected,
    isRecording,
    websocket: wsRef.current,
    startVoskTranscription: startRecording,
    stopVoskTranscription: stopRecording,
    reconnect: connectWebSocket,

    // ✅ REQUEST SUGGESTIONS: Send text message correctly
    requestSuggestions: (ragType = "standard") => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log(`🤖 Requesting suggestions (${ragType})`);
        // ✅ FIXED: Send JSON string for text control messages
        wsRef.current.send(
          JSON.stringify({
            type: "request_suggestions",
            rag_type: ragType,
            include_partial: true,
          })
        );
      } else {
        console.warn("⚠️ Cannot request suggestions - WebSocket not connected");
      }
    },

    // ✅ SEND DOCTOR REPLY: Text message format
    sendDoctorReply: (text) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log("👨‍⚕️ Sending doctor reply:", text);
        // ✅ FIXED: Send JSON string for text control messages
        wsRef.current.send(
          JSON.stringify({
            type: "doctor_reply",
            text: text,
          })
        );
      } else {
        console.warn("⚠️ Cannot send doctor reply - WebSocket not connected");
      }
    },
  };

  return children ? children(transcriptionContext) : null;
}
